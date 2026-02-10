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

    const { id: requestId } = await params;
    if (!requestId) {
      return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
    }

    const db = getAdminDb();
    const requestSnap = await db.collection('instantRequests').doc(requestId).get();

    if (!requestSnap.exists) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
    }

    const requestData = requestSnap.data()!;
    if (requestData.clientId !== payload.clientId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const locationSnap = await db
      .collection('instantRequests')
      .doc(requestId)
      .collection('plombierLocation')
      .doc('current')
      .get();

    if (!locationSnap.exists) {
      return NextResponse.json({ lat: null, lng: null, updatedAt: null });
    }

    const data = locationSnap.data()!;
    const updatedAt = data.updatedAt?.toDate?.();
    return NextResponse.json({
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      updatedAt: updatedAt ? updatedAt.toISOString() : null,
    });
  } catch (error) {
    console.error('[plombier-location] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
