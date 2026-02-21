import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { verifyClientToken } from '@/lib/jwt';
import { Timestamp } from 'firebase-admin/firestore';

/** POST: Soumettre un avis (client ou plombier) */
export async function POST(request: NextRequest) {
  try {
    const db = getAdminDb();
    const body = await request.json();
    const { instantRequestId, toUserId, rating, comment } = body;

    if (!instantRequestId || !toUserId || !rating || typeof rating !== 'number') {
      return NextResponse.json(
        { error: 'instantRequestId, toUserId et rating requis' },
        { status: 400 }
      );
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Note entre 1 et 5' }, { status: 400 });
    }

    const auth = request.headers.get('authorization');
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const requestRef = db.collection('instantRequests').doc(instantRequestId);
    const reqSnap = await requestRef.get();
    if (!reqSnap.exists) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
    }

    const reqData = reqSnap.data()!;
    if (reqData.status !== 'termine') {
      return NextResponse.json(
        { error: 'Seules les interventions terminées peuvent être notées' },
        { status: 400 }
      );
    }

    const clientId = reqData.clientId as string;
    const plombierId = reqData.plombierId as string;

    let fromUserId: string;
    let fromRole: 'client' | 'plombier';

    // Essayer token client (JWT)
    const clientPayload = await verifyClientToken(token);
    if (clientPayload && clientPayload.clientId === clientId) {
      fromUserId = clientId;
      fromRole = 'client';
      if (toUserId !== plombierId) {
        return NextResponse.json({ error: 'toUserId invalide' }, { status: 400 });
      }
    } else {
      // Essayer token plombier (Firebase)
      const app = getApps()[0];
      if (!app) {
        return NextResponse.json({ error: 'Configuration serveur' }, { status: 500 });
      }
      try {
        const decoded = await getAuth(app).verifyIdToken(token);
        if (decoded.uid !== plombierId) {
          return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
        }
        fromUserId = plombierId;
        fromRole = 'plombier';
        if (toUserId !== clientId) {
          return NextResponse.json({ error: 'toUserId invalide' }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 401 });
      }
    }

    // Vérifier qu'il n'a pas déjà noté
    const existingSnap = await db
      .collection('reviews')
      .where('instantRequestId', '==', instantRequestId)
      .where('fromUserId', '==', fromUserId)
      .get();

    if (!existingSnap.empty) {
      return NextResponse.json(
        { error: 'Vous avez déjà laissé un avis pour cette intervention' },
        { status: 400 }
      );
    }

    const now = Timestamp.now();
    await db.collection('reviews').add({
      instantRequestId,
      fromUserId,
      toUserId,
      fromRole,
      rating,
      comment: comment?.trim() || null,
      createdAt: now,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[reviews POST] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
