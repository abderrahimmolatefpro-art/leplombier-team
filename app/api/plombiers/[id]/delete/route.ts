import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';

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

    let app;
    try {
      app = getAdminApp();
    } catch (initError) {
      console.error('[api/plombiers/delete] Firebase Admin init failed:', initError);
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

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID plombier requis' }, { status: 400 });
    }

    const plombierRef = db.collection('users').doc(id);
    const plombierSnap = await plombierRef.get();
    if (!plombierSnap.exists) {
      return NextResponse.json({ error: 'Plombier introuvable' }, { status: 404 });
    }

    const plombierData = plombierSnap.data()!;
    if (plombierData.role !== 'plombier') {
      return NextResponse.json({ error: 'Ce compte n\'est pas un plombier' }, { status: 400 });
    }

    const auth = getAuth(app);
    try {
      await auth.deleteUser(id);
    } catch (authErr: unknown) {
      const err = authErr as { code?: string };
      if (err.code === 'auth/user-not-found') {
        // L'utilisateur Auth n'existe plus, on continue pour supprimer Firestore
      } else {
        console.error('[api/plombiers/delete] Auth deleteUser error:', authErr);
        return NextResponse.json(
          { error: 'Erreur lors de la suppression du compte Firebase Auth' },
          { status: 500 }
        );
      }
    }

    await plombierRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/plombiers/delete] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
