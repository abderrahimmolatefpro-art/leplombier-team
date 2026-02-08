import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyClientToken } from '@/lib/jwt';

export async function GET(request: NextRequest) {
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

    const db = getAdminDb();
    const now = new Date();
    const snapshot = await db
      .collection('clientPromoCodes')
      .where('clientId', '==', payload.clientId)
      .where('used', '==', false)
      .get();

    const promoCodes = snapshot.docs
      .map((d) => {
        const data = d.data();
        const expiresAt = data.expiresAt?.toDate?.();
        if (expiresAt && expiresAt < now) return null;
        return {
          id: d.id,
          ...data,
          activatedAt: data.activatedAt?.toDate?.()?.toISOString?.() || null,
          expiresAt: expiresAt?.toISOString?.() || null,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ promoCodes });
  } catch (error) {
    console.error('[promo-codes] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
