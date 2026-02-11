import { NextRequest, NextResponse } from 'next/server';
import { getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getAdminDb } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
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

    let decodedToken: { uid: string };
    try {
      decodedToken = await getAuth(app).verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 401 });
    }

    const plombierId = decodedToken.uid;
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(plombierId).get();
    if (!userDoc.exists || (userDoc.data()?.role as string) !== 'plombier') {
      return NextResponse.json({ error: 'Compte plombier requis' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const fcmToken = body.fcmToken;
    if (!fcmToken || typeof fcmToken !== 'string') {
      return NextResponse.json({ error: 'fcmToken requis' }, { status: 400 });
    }

    await db.collection('users').doc(plombierId).update({
      fcmToken: fcmToken.trim(),
      updatedAt: new Date(),
    });

    console.log('[FCM] register-fcm-token plombier OK:', plombierId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[register-fcm-token plombier] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
