import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import { sendSms } from '@/lib/sms';

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
      console.error('[api/plombiers/reject-documents] Firebase Admin init failed:', initError);
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
    const { plombierId } = body;
    if (!plombierId) {
      return NextResponse.json({ error: 'plombierId requis' }, { status: 400 });
    }

    const plombierRef = db.collection('users').doc(plombierId);
    const plombierSnap = await plombierRef.get();
    if (!plombierSnap.exists) {
      return NextResponse.json({ error: 'Plombier introuvable' }, { status: 404 });
    }

    const plombierData = plombierSnap.data()!;
    if (plombierData.role !== 'plombier') {
      return NextResponse.json({ error: 'Ce compte n\'est pas un plombier' }, { status: 400 });
    }

    const phone = plombierData.phone?.trim();
    if (!phone) {
      return NextResponse.json(
        { error: 'Le plombier n\'a pas de numéro de téléphone' },
        { status: 400 }
      );
    }

    await plombierRef.update({
      validationStatus: 'rejected',
      updatedAt: Timestamp.now(),
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dash.leplombier.ma';
    const appPlombierUrl = `${appUrl}/app-plombier`;
    const smsMessage = `Vos documents ont été rejetés. Veuillez soumettre de nouveaux documents : ${appPlombierUrl}`;

    try {
      const sent = await sendSms(phone, smsMessage);
      if (!sent) {
        console.warn('[api/plombiers/reject-documents] SMS non envoyé');
      }
    } catch (smsError) {
      console.error('[api/plombiers/reject-documents] SMS error:', smsError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/plombiers/reject-documents] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
