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

    let decodedToken: { uid: string };
    try {
      decodedToken = await getAuth(app).verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 401 });
    }

    const plombierId = decodedToken.uid;
    const { id: requestId } = await params;
    if (!requestId) {
      return NextResponse.json({ error: 'ID demande manquant' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const etaMinutes = typeof body.etaMinutes === 'number' ? Math.round(body.etaMinutes) : null;
    if (etaMinutes == null || etaMinutes < 5 || etaMinutes > 120) {
      return NextResponse.json(
        { error: 'Indiquez une arrivée entre 5 et 120 minutes' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const requestRef = db.collection('instantRequests').doc(requestId);
    const snap = await requestRef.get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
    }

    const data = snap.data()!;
    if ((data.plombierId as string) !== plombierId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }
    if ((data.status as string) !== 'accepte') {
      return NextResponse.json({ error: 'Cette demande n\'est pas en cours' }, { status: 400 });
    }

    const now = new Date();
    const etaAt = new Date(now.getTime() + etaMinutes * 60 * 1000);

    await requestRef.update({
      etaMinutes,
      etaAt: Timestamp.fromDate(etaAt),
      updatedAt: Timestamp.now(),
    });

    const userDoc = await db.collection('users').doc(plombierId).get();
    const plombierName = userDoc.exists ? (userDoc.data()?.name as string) || 'Le plombier' : 'Le plombier';

    const etaText =
      etaMinutes <= 15
        ? `dans ${etaMinutes} min`
        : etaMinutes <= 60
          ? `dans environ ${etaMinutes} min`
          : `dans environ ${Math.round(etaMinutes / 60)}h`;

    await notifyClient(
      data.clientId as string,
      'Heure d\'arrivée',
      `${plombierName} sera chez vous ${etaText}`,
      { name: 'heure_arrivee', params: [plombierName, etaText] }
    );

    return NextResponse.json({
      ok: true,
      etaMinutes,
      etaAt: etaAt.toISOString(),
    });
  } catch (error) {
    console.error('[set-eta] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
