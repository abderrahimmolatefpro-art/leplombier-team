import { NextRequest, NextResponse } from 'next/server';
import { getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getAdminDb } from '@/lib/firebase-admin';

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

    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const role = userDoc.data()?.role;
    if (!userDoc.exists || role !== 'admin') {
      return NextResponse.json({ error: 'Droits administrateur requis' }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID client requis' }, { status: 400 });
    }

    const clientRef = db.collection('clients').doc(id);
    const clientDoc = await clientRef.get();
    if (!clientDoc.exists) {
      return NextResponse.json({ error: 'Client introuvable' }, { status: 404 });
    }

    await clientRef.delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[api/clients] Error deleting client:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
