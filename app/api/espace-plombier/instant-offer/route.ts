import { NextRequest, NextResponse } from 'next/server';
import { appendFileSync } from 'fs';
import { join } from 'path';
import { getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getAdminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { notifyClient } from '@/lib/notify';

const DEBUG_LOG = join(process.cwd(), '.cursor', 'debug.log');
function agentLog(p: { location: string; message: string; data?: Record<string, unknown>; hypothesisId?: string }) {
  try {
    appendFileSync(DEBUG_LOG, JSON.stringify({ ...p, timestamp: Date.now() }) + '\n');
  } catch (_) {}
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    // #region agent log
    agentLog({ location: 'instant-offer/route.ts:entry', message: 'POST instant-offer', data: { hasToken: !!token }, hypothesisId: 'H1' });
    // #endregion
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const db = getAdminDb();
    const app = getApps()[0];
    // #region agent log
    agentLog({ location: 'instant-offer/route.ts:after_app', message: 'Firebase app', data: { hasApp: !!app }, hypothesisId: 'H3' });
    // #endregion
    if (!app) {
      console.error('[instant-offer] Firebase Admin app not initialized');
      return NextResponse.json({ error: 'Configuration serveur' }, { status: 500 });
    }
    const auth = getAuth(app);
    let decodedToken: { uid: string };
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (err) {
      // #region agent log
      agentLog({ location: 'instant-offer/route.ts:verifyIdToken_fail', message: 'verifyIdToken failed', data: { error: String(err) }, hypothesisId: 'H3' });
      // #endregion
      console.error('[instant-offer] verifyIdToken:', err);
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 401 });
    }

    const plombierId = decodedToken.uid;
    const userDoc = await db.collection('users').doc(plombierId).get();
    if (!userDoc.exists || (userDoc.data()?.role as string) !== 'plombier') {
      return NextResponse.json({ error: 'Compte plombier requis' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { requestId, proposedAmount, message } = body;
    // #region agent log
    agentLog({ location: 'instant-offer/route.ts:body', message: 'Body parsed', data: { requestId: !!requestId, proposedAmount, typeOf: typeof proposedAmount }, hypothesisId: 'H2' });
    // #endregion
    if (!requestId || typeof requestId !== 'string') {
      return NextResponse.json({ error: 'requestId requis' }, { status: 400 });
    }
    const amount = Number(proposedAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: 'proposedAmount invalide (nombre >= 0)' }, { status: 400 });
    }

    const requestRef = db.collection('instantRequests').doc(requestId);
    const requestSnap = await requestRef.get();

    if (!requestSnap.exists) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
    }

    const requestData = requestSnap.data()!;
    if (requestData.status !== 'en_attente') {
      return NextResponse.json({ error: 'Cette demande n\'est plus disponible' }, { status: 400 });
    }

    const expiresAt = requestData.expiresAt?.toDate?.();
    if (expiresAt && expiresAt <= new Date()) {
      return NextResponse.json({ error: 'La demande a expiré' }, { status: 400 });
    }

    const existingOffer = await db
      .collection('instantOffers')
      .where('requestId', '==', requestId)
      .where('plombierId', '==', plombierId)
      .limit(1)
      .get();

    if (!existingOffer.empty) {
      return NextResponse.json(
        { error: 'Vous avez déjà envoyé une offre pour cette demande' },
        { status: 400 }
      );
    }

    const now = Timestamp.now();
    const messageTrimmed = typeof message === 'string' ? message.trim().slice(0, 500) : '';
    const offerDataToWrite: Record<string, unknown> = {
      requestId,
      plombierId,
      proposedAmount: amount,
      status: 'en_attente',
      createdAt: now,
      updatedAt: now,
    };
    if (messageTrimmed) offerDataToWrite.message = messageTrimmed;
    // #region agent log
    agentLog({ location: 'instant-offer/route.ts:before_add', message: 'Before Firestore add', data: { requestId, amount }, hypothesisId: 'H4' });
    // #endregion
    const docRef = await db.collection('instantOffers').add(offerDataToWrite);
    // #region agent log
    agentLog({ location: 'instant-offer/route.ts:after_add', message: 'Offer created', data: { id: docRef.id }, hypothesisId: 'H4' });
    // #endregion

    const plombierName = (userDoc.data()?.name as string) || 'Un plombier';
    const clientId = requestData.clientId as string;
    await notifyClient(
      clientId,
      'Nouvelle offre',
      `${plombierName} propose ${amount} MAD`,
      { name: 'nouvelle_offre', params: [plombierName, String(amount)] }
    );

    return NextResponse.json({
      id: docRef.id,
      requestId,
      proposedAmount: amount,
      status: 'en_attente',
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    try {
      appendFileSync(
        DEBUG_LOG,
        JSON.stringify({
          location: 'instant-offer/route.ts:catch',
          message: '500 error',
          data: { error: errMsg, stack: errStack },
          timestamp: Date.now(),
        }) + '\n'
      );
    } catch (_) {}
    console.error('[instant-offer] POST Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
