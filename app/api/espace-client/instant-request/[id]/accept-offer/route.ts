import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyClientToken } from '@/lib/jwt';
import { Timestamp } from 'firebase-admin/firestore';
import { notifyPlombier } from '@/lib/notify';

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
    const offerId = body.offerId;
    if (!offerId || typeof offerId !== 'string') {
      return NextResponse.json({ error: 'offerId requis' }, { status: 400 });
    }

    const db = getAdminDb();
    const requestRef = db.collection('instantRequests').doc(requestId);
    const offerRef = db.collection('instantOffers').doc(offerId);

    const [requestSnap, offerSnap] = await Promise.all([
      requestRef.get(),
      offerRef.get(),
    ]);

    if (!requestSnap.exists) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
    }
    if (!offerSnap.exists) {
      return NextResponse.json({ error: 'Offre introuvable' }, { status: 404 });
    }

    const requestData = requestSnap.data()!;
    const offerData = offerSnap.data()!;

    if (requestData.clientId !== payload.clientId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }
    if (requestData.status !== 'en_attente') {
      return NextResponse.json({ error: 'Cette demande n\'est plus disponible' }, { status: 400 });
    }
    if (offerData.requestId !== requestId) {
      return NextResponse.json({ error: 'Offre invalide pour cette demande' }, { status: 400 });
    }
    if (offerData.status !== 'en_attente') {
      return NextResponse.json({ error: 'Cette offre n\'est plus disponible' }, { status: 400 });
    }

    const expiresAt = requestData.expiresAt?.toDate?.();
    if (expiresAt && expiresAt <= new Date()) {
      return NextResponse.json({ error: 'La demande a expiré' }, { status: 400 });
    }

    const plombierId = offerData.plombierId as string;
    const now = Timestamp.now();

    const otherOffersSnap = await db
      .collection('instantOffers')
      .where('requestId', '==', requestId)
      .get();

    await db.runTransaction(async (transaction) => {
      transaction.update(requestRef, {
        status: 'accepte',
        plombierId,
        acceptedAt: now,
        updatedAt: now,
      });
      transaction.update(offerRef, {
        status: 'accepte',
        updatedAt: now,
      });
      for (const d of otherOffersSnap.docs) {
        if (d.id === offerId) continue;
        transaction.update(d.ref, { status: 'refuse', updatedAt: now });
      }
    });

    const clientId = requestData.clientId as string;
    const amount = Number(offerData.proposedAmount);
    const address = (requestData.address as string) || '';
    const descriptionText = (requestData.description as string) || '';
    const depannageDescription =
      descriptionText.length > 0
        ? `Intervention instantanée – ${descriptionText}${address ? ` (${address})` : ''}`
        : `Intervention instantanée${address ? ` – ${address}` : ''}`;

    await db.collection('manualRevenues').add({
      clientId,
      plombierId,
      amount: Number.isFinite(amount) ? amount : 0,
      date: now,
      description: depannageDescription,
      plombierPercentage: 60,
      instantRequestId: requestId,
      createdAt: now,
      updatedAt: now,
    });

    const userDoc = await db.collection('users').doc(plombierId).get();
    const uData = userDoc.exists ? userDoc.data() : null;
    const plombier = userDoc.exists && uData
      ? {
          id: userDoc.id,
          name: (uData.name as string) || '',
          phone: (uData.phone as string) || undefined,
          certified: !!uData.certified,
        }
      : null;

    await notifyPlombier(
      plombierId,
      'Votre offre a été acceptée',
      address ? `– ${address.slice(0, 80)}` : 'Le client a accepté votre offre'
    );

    return NextResponse.json({
      ok: true,
      plombier,
    });
  } catch (error) {
    console.error('[accept-offer] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
