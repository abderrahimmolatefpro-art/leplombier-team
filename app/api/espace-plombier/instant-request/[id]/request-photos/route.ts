import { NextRequest, NextResponse } from 'next/server';
import { getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { notifyClient } from '@/lib/notify';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const app = getApps()[0];
    if (!app) {
      return NextResponse.json({ error: 'Configuration serveur' }, { status: 500 });
    }

    let plombierId: string;
    try {
      const decoded = await getAuth(app).verifyIdToken(token);
      plombierId = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 401 });
    }

    const { id: requestId } = await params;
    if (!requestId) {
      return NextResponse.json({ error: 'ID demande manquant' }, { status: 400 });
    }

    const db = getAdminDb();
    const requestRef = db.collection('instantRequests').doc(requestId);
    const snap = await requestRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
    }

    const data = snap.data()!;
    if ((data.status as string) !== 'en_attente') {
      return NextResponse.json({ error: 'Cette demande n\'est plus disponible' }, { status: 400 });
    }

    if (data.photoRequested) {
      return NextResponse.json({ error: 'Des photos ont déjà été demandées' }, { status: 400 });
    }

    const now = Timestamp.now();
    await requestRef.update({
      photoRequested: true,
      photoRequestedAt: now,
      photoRequestedBy: plombierId,
      updatedAt: now,
    });

    const clientId = data.clientId as string;
    await notifyClient(
      clientId,
      'Photos demandées',
      'Un plombier souhaite voir des photos pour mieux estimer le prix.',
      { name: 'photos_demandees', params: [] }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[request-photos] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
