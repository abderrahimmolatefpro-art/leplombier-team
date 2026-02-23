import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyClientToken } from '@/lib/jwt';

export async function GET(
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
    const doc = await db.collection('instantRequests').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
    }

    const data = doc.data()!;
    if (data.clientId !== payload.clientId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const plombierId = data.plombierId || null;
    let plombier: { id: string; name: string; phone?: string; certified?: boolean } | null = null;
    if (plombierId) {
      const userDoc = await db.collection('users').doc(plombierId).get();
      if (userDoc.exists) {
        const u = userDoc.data()!;
        plombier = {
          id: userDoc.id,
          name: (u.name as string) || '',
          phone: u.phone as string | undefined,
          certified: !!u.certified,
        };
      }
    }

    // Stats d'avis pour les plombiers
    const getPlombierRating = async (pid: string) => {
      const revSnap = await db
        .collection('reviews')
        .where('toUserId', '==', pid)
        .get();
      let total = 0;
      let sum = 0;
      revSnap.docs.forEach((d) => {
        const r = d.data().rating;
        if (typeof r === 'number' && r >= 1 && r <= 5) {
          total++;
          sum += r;
        }
      });
      return total > 0
        ? { averageRating: Math.round((sum / total) * 10) / 10, reviewCount: total }
        : { averageRating: null, reviewCount: 0 };
    };

    // Offres plombiers (style inDrive) pour cette demande
    const offersSnap = await db.collection('instantOffers').where('requestId', '==', id).get();
    const offers: Array<{
      id: string;
      plombierId: string;
      plombierName: string;
      proposedAmount: number;
      message?: string;
      status: string;
      certified?: boolean;
      averageRating?: number | null;
      reviewCount?: number;
    }> = [];
    for (const o of offersSnap.docs) {
      const oData = o.data();
      if (oData.status !== 'en_attente') continue;
      const userDoc = await db.collection('users').doc(oData.plombierId).get();
      const uData = userDoc.exists ? userDoc.data() : null;
      const plombierName = (uData?.name as string) || '';
      const certified = !!uData?.certified;
      const { averageRating, reviewCount } = await getPlombierRating(oData.plombierId);
      offers.push({
        id: o.id,
        plombierId: oData.plombierId,
        plombierName,
        proposedAmount: oData.proposedAmount ?? 0,
        message: oData.message,
        status: oData.status,
        certified,
        averageRating,
        reviewCount,
      });
    }

    // Vérifier si client/plombier a déjà noté (pour status termine)
    let clientHasReviewed = false;
    let plombierHasReviewed = false;
    if (data.status === 'termine') {
      const reviewsSnap = await db
        .collection('reviews')
        .where('instantRequestId', '==', id)
        .get();
      reviewsSnap.docs.forEach((d) => {
        const r = d.data();
        if (r.fromUserId === data.clientId) clientHasReviewed = true;
        if (r.fromUserId === data.plombierId) plombierHasReviewed = true;
      });
    }

    return NextResponse.json({
      id: doc.id,
      status: data.status,
      address: data.address,
      description: data.description,
      clientProposedAmount: data.clientProposedAmount ?? undefined,
      photoRequested: !!data.photoRequested,
      photos: data.photos || [],
      plombierId,
      plombier,
      offers,
      clientHasReviewed,
      plombierHasReviewed,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
      acceptedAt: data.acceptedAt?.toDate?.()?.toISOString?.() || null,
      expiresAt: data.expiresAt?.toDate?.()?.toISOString?.() || null,
    });
  } catch (error) {
    console.error('[instant-request] GET Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
