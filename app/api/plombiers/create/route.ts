import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import { phoneToAuthEmail } from '@/lib/auth-utils';

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
      console.error('[api/plombiers/create] Firebase Admin init failed:', initError);
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
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 403 });
    }
    const role = userDoc.data()?.role;
    if (role !== 'admin' && role !== 'Admin') {
      return NextResponse.json({ error: 'Droits administrateur requis' }, { status: 403 });
    }

    const body = await request.json();
    const { name, phone, password } = body;
    if (!name || !phone || !password || password.length < 6) {
      return NextResponse.json(
        { error: 'name, phone et password (min 6 caractères) requis' },
        { status: 400 }
      );
    }

    const authEmail = phoneToAuthEmail(phone);
    const auth = getAuth(app);

    let createdUser;
    try {
      createdUser = await auth.createUser({
        email: authEmail,
        password,
        displayName: name,
      });
    } catch (authError: unknown) {
      const err = authError as { code?: string; message?: string };
      if (err.code === 'auth/email-already-exists') {
        return NextResponse.json(
          { error: 'Un compte existe déjà avec ce numéro de téléphone' },
          { status: 400 }
        );
      }
      console.error('[api/plombiers/create] Auth createUser error:', authError);
      return NextResponse.json(
        { error: err.message || 'Erreur lors de la création du compte' },
        { status: 500 }
      );
    }

    await db.collection('users').doc(createdUser.uid).set({
      email: authEmail,
      name: name.trim(),
      phone: phone.trim(),
      role: 'plombier',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      plombierId: createdUser.uid,
      message: 'Plombier créé avec succès.',
    });
  } catch (error) {
    console.error('[api/plombiers/create] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
