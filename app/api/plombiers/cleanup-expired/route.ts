import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';

const EXPIRY_DAYS = 3;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    let app;
    try {
      app = getAdminApp();
    } catch (initError) {
      console.error('[api/plombiers/cleanup-expired] Firebase Admin init failed:', initError);
      return NextResponse.json(
        { error: 'Configuration Firebase manquante.' },
        { status: 500 }
      );
    }

    let decodedToken: { uid: string };
    try {
      decodedToken = await getAuth(app).verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: 'Token invalide ou expiré' }, { status: 401 });
    }

    const db = getAdminDb();
    const adminDoc = await db.collection('users').doc(decodedToken.uid).get();
    if (!adminDoc.exists) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 403 });
    }
    const role = adminDoc.data()?.role;
    if (role !== 'admin' && role !== 'Admin') {
      return NextResponse.json({ error: 'Droits administrateur requis' }, { status: 403 });
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - EXPIRY_DAYS);
    cutoff.setHours(0, 0, 0, 0);

    const plombiersSnap = await db
      .collection('users')
      .where('role', '==', 'plombier')
      .get();

    const auth = getAuth(app);
    let deletedCount = 0;

    for (const doc of plombiersSnap.docs) {
      const data = doc.data();
      if (data.validationStatus !== 'pending_documents') continue;
      const createdAt = data.createdAt?.toDate?.();
      if (!createdAt || createdAt >= cutoff) continue;

      try {
        await auth.deleteUser(doc.id);
      } catch (authErr: unknown) {
        const err = authErr as { code?: string };
        if (err.code !== 'auth/user-not-found') {
          console.error('[cleanup-expired] Auth deleteUser error for', doc.id, authErr);
          continue;
        }
      }
      await doc.ref.delete();
      deletedCount++;
    }

    return NextResponse.json({ success: true, deletedCount });
  } catch (error) {
    console.error('[api/plombiers/cleanup-expired] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
