import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyClientToken } from '@/lib/jwt';
import { Timestamp } from 'firebase-admin/firestore';
import { sendPushToPlombier } from '@/lib/fcm';

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
    if (data.status !== 'accepte') {
      return NextResponse.json({ error: 'Cette demande n\'est pas en cours' }, { status: 400 });
    }

    const now = Timestamp.now();
    await requestRef.update({
      clientReadyAt: now,
      updatedAt: now,
    });

    const plombierId = data.plombierId as string;
    if (plombierId) {
      await sendPushToPlombier(
        plombierId,
        'Client prêt',
        'Le client est chez lui et vous attend'
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[ready] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
