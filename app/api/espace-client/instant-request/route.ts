import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyClientToken } from '@/lib/jwt';
import { Timestamp } from 'firebase-admin/firestore';
import { sendPushToPlombier } from '@/lib/fcm';

const EXPIRE_MINUTES = 15;

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { address, description, clientProposedAmount, serviceId } = body;

    if (!address || typeof address !== 'string' || !description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Adresse et description requises' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + EXPIRE_MINUTES * 60 * 1000);

    const requestData: Record<string, unknown> = {
      clientId: payload.clientId,
      address: address.trim(),
      description: description.trim(),
      status: 'en_attente',
      createdAt: Timestamp.fromDate(now),
      expiresAt: Timestamp.fromDate(expiresAt),
      updatedAt: Timestamp.fromDate(now),
    };
    if (typeof clientProposedAmount === 'number' && clientProposedAmount >= 0) {
      requestData.clientProposedAmount = clientProposedAmount;
    }
    if (typeof serviceId === 'string' && serviceId.trim()) {
      requestData.serviceId = serviceId.trim();
    }

    const docRef = await db.collection('instantRequests').add(requestData);

    // Push aux plombiers disponibles (style InDrive)
    const plombiersSnap = await db
      .collection('users')
      .where('role', '==', 'plombier')
      .where('availableForInstant', '==', true)
      .get();
    const addr = address.trim().slice(0, 100);
    const amount = typeof clientProposedAmount === 'number' && clientProposedAmount >= 0 ? clientProposedAmount : null;
    const bodyParts: string[] = [];
    if (amount != null) bodyParts.push(`${amount} MAD`);
    if (addr) bodyParts.push(addr);
    const pushBody = bodyParts.length ? bodyParts.join(' · ') : 'Une nouvelle demande est disponible';
    const pushTitle = 'Nouvelle demande — disponible maintenant';
    const assignablePlombiers = plombiersSnap.docs.filter((d) => {
      const s = d.data().validationStatus;
      return s === 'validated' || !s;
    });
    console.log('[FCM] instant-request: plombiers disponibles:', assignablePlombiers.map((d) => ({ id: d.id, hasFcm: !!d.data().fcmToken })));
    for (const plombierDoc of assignablePlombiers) {
      await sendPushToPlombier(plombierDoc.id, pushTitle, pushBody, { requestId: docRef.id });
    }

    // #region agent log
    fetch('http://127.0.0.1:7247/ingest/1e4b6d28-5f5e-432f-850b-6a10e26e4bd1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'instant-request/route.ts:after_add',message:'Instant request created',data:{id:docRef.id,status:'en_attente'},timestamp:Date.now(),hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    return NextResponse.json({
      id: docRef.id,
      status: 'en_attente',
      expiresAt: expiresAt.toISOString(),
      clientProposedAmount: typeof clientProposedAmount === 'number' && clientProposedAmount >= 0 ? clientProposedAmount : undefined,
    });
  } catch (error) {
    console.error('[instant-request] POST Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
