import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyClientToken } from '@/lib/jwt';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const payload = await verifyClientToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const fcmToken = body.fcmToken;
    if (!fcmToken || typeof fcmToken !== 'string') {
      return NextResponse.json({ error: 'fcmToken requis' }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection('clients').doc(payload.clientId).update({
      fcmToken: fcmToken.trim(),
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[register-fcm-token client] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
