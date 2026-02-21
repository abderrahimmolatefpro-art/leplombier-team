import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

/** GET ?userId=xxx - Stats d'avis pour un utilisateur (moyenne + nombre) */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'userId requis' }, { status: 400 });
    }

    const db = getAdminDb();
    const snap = await db
      .collection('reviews')
      .where('toUserId', '==', userId)
      .get();

    let total = 0;
    let sum = 0;
    snap.docs.forEach((d) => {
      const r = d.data().rating;
      if (typeof r === 'number' && r >= 1 && r <= 5) {
        total++;
        sum += r;
      }
    });

    const averageRating = total > 0 ? Math.round((sum / total) * 10) / 10 : null;
    const reviewCount = total;

    return NextResponse.json({
      averageRating,
      reviewCount,
    });
  } catch (error) {
    console.error('[reviews stats] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
