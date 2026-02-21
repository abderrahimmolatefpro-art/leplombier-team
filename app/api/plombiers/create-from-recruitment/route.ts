import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import { phoneToAuthEmail } from '@/lib/auth-utils';
import { sendSms } from '@/lib/sms';
import { cityFromZone, toCanonicalCity } from '@/lib/cities';

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
      console.error('[api/plombiers/create-from-recruitment] Firebase Admin init failed:', initError);
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
    const { recruitmentId, password } = body;
    if (!recruitmentId || !password || password.length < 6) {
      return NextResponse.json(
        { error: 'recruitmentId et password (min 6 caractères) requis' },
        { status: 400 }
      );
    }

    const recruitmentRef = db.collection('recruitments').doc(recruitmentId);
    const recruitmentSnap = await recruitmentRef.get();
    if (!recruitmentSnap.exists) {
      return NextResponse.json({ error: 'Candidature introuvable' }, { status: 404 });
    }

    const data = recruitmentSnap.data()!;
    if (data.status === 'accepted') {
      return NextResponse.json(
        { error: 'Cette candidature a déjà été acceptée' },
        { status: 400 }
      );
    }

    const firstName = data.firstName || '';
    const lastName = data.lastName || '';
    const phone = (data.phone || '').trim();
    if (!phone) {
      return NextResponse.json(
        { error: 'La candidature n\'a pas de numéro de téléphone' },
        { status: 400 }
      );
    }

    const name = `${firstName} ${lastName}`.trim() || 'Plombier';
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
      console.error('[api/plombiers/create-from-recruitment] Auth createUser error:', authError);
      return NextResponse.json(
        { error: err.message || 'Erreur lors de la création du compte' },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dash.leplombier.ma';
    const appPlombierUrl = `${appUrl}/app-plombier`;

    let city: string | undefined;
    if (data.city && typeof data.city === 'string') {
      city = toCanonicalCity(data.city) ?? undefined;
    } else if (typeof data.zones === 'string') {
      city = cityFromZone(data.zones) ?? undefined;
    } else if (data.zones && Array.isArray(data.zones) && data.zones.length > 0) {
      city = cityFromZone(data.zones[0]) ?? undefined;
    }

    await db.collection('users').doc(createdUser.uid).set({
      email: authEmail,
      name,
      phone,
      role: 'plombier',
      validationStatus: 'pending_documents',
      ...(city && { city }),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await recruitmentRef.update({
      status: 'accepted',
      updatedAt: new Date(),
      createdPlombierId: createdUser.uid,
    });

    const smsMessage = `Félicitations ! Vous êtes accepté sur leplombier.ma. Vos accès : Tél: ${phone} / MDP: ${password}. Accédez à votre espace et téléchargez l'app Android : ${appPlombierUrl}`;
    try {
      const sent = await sendSms(phone, smsMessage);
      if (!sent) {
        console.warn('[api/plombiers/create-from-recruitment] SMS non envoyé');
      }
    } catch (smsError) {
      console.error('[api/plombiers/create-from-recruitment] SMS error:', smsError);
    }

    return NextResponse.json({
      success: true,
      plombierId: createdUser.uid,
      message: 'Compte plombier créé. Communiquez le mot de passe au plombier.',
    });
  } catch (error) {
    console.error('[api/plombiers/create-from-recruitment] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
