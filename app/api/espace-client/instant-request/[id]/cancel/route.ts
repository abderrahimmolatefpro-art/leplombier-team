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

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
    }

    const db = getAdminDb();
    const requestRef = db.collection('instantRequests').doc(id);
    const snap = await requestRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
    }

    const data = snap.data()!;
    if (data.clientId !== payload.clientId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }
    if (data.status !== 'en_attente') {
      return NextResponse.json({ error: 'Cette demande ne peut plus être annulée' }, { status: 400 });
    }

    const now = Timestamp.now();
    await requestRef.update({
      status: 'annule',
      updatedAt: now,
    });

    const offersSnap = await db
      .collection('instantOffers')
      .where('requestId', '==', id)
      .get();
    for (const offerDoc of offersSnap.docs) {
      const plombierId = offerDoc.data()?.plombierId;
      if (plombierId) {
        await sendPushToPlombier(
          plombierId,
          'Demande annulée',
          'La demande a été annulée par le client'
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[instant-request cancel] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
