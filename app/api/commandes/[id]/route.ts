import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';

const VALID_TYPES = ['project', 'depannage', 'instant'] as const;

export async function DELETE(
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
      console.error('[api/commandes] Firebase Admin init failed:', initError);
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
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    // Autoriser tout utilisateur authentifié ayant un document dans users (accès CRM)
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Utilisateur non trouvé dans le CRM' }, { status: 403 });
    }

    const { id } = await params;
    const type = request.nextUrl.searchParams.get('type') as (typeof VALID_TYPES)[number] | null;

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: 'Paramètre type requis: project, depannage ou instant' },
        { status: 400 }
      );
    }

    const collectionName =
      type === 'project' ? 'projects' :
      type === 'depannage' ? 'manualRevenues' :
      'instantRequests';

    const docRef = db.collection(collectionName).doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
    }

    await docRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/commandes] Error deleting:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
