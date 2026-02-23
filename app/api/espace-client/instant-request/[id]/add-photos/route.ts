import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyClientToken } from '@/lib/jwt';
import { Timestamp } from 'firebase-admin/firestore';

const MAX_PHOTOS = 5;
const MAX_PHOTO_SIZE = 300 * 1024; // 300KB per photo (compressed)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = request.headers.get('authorization');
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const payload = await verifyClientToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 401 });
    }

    const { id: requestId } = await params;
    if (!requestId) {
      return NextResponse.json({ error: 'ID demande manquant' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const photos = body.photos;
    if (!Array.isArray(photos) || photos.length === 0) {
      return NextResponse.json({ error: 'Au moins une photo requise' }, { status: 400 });
    }
    if (photos.length > MAX_PHOTOS) {
      return NextResponse.json({ error: `Maximum ${MAX_PHOTOS} photos` }, { status: 400 });
    }

    const validUrls: string[] = [];
    for (const p of photos) {
      if (typeof p !== 'string' || !p.startsWith('data:image/')) continue;
      if (p.length > MAX_PHOTO_SIZE * 2) continue; // base64 approx 1.33x
      validUrls.push(p);
    }

    if (validUrls.length === 0) {
      return NextResponse.json({ error: 'Photos invalides (format attendu: data URL)' }, { status: 400 });
    }

    const db = getAdminDb();
    const requestRef = db.collection('instantRequests').doc(requestId);
    const snap = await requestRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
    }

    const data = snap.data()!;
    if (data.clientId !== payload.clientId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }
    if (data.status !== 'en_attente') {
      return NextResponse.json({ error: 'Cette demande n\'est plus modifiable' }, { status: 400 });
    }

    const existing = (data.photos as string[]) || [];
    const updated = [...existing, ...validUrls].slice(0, MAX_PHOTOS);

    await requestRef.update({
      photos: updated,
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({ ok: true, count: updated.length });
  } catch (error) {
    console.error('[add-photos] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
