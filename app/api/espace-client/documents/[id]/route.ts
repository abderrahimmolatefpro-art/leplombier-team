import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { verifyClientToken } from '@/lib/jwt';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const docId = params.id;
    const db = getAdminDb();
    const docRef = await db.collection('documents').doc(docId).get();

    if (!docRef.exists) {
      return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
    }

    const data = docRef.data()!;
    if (data.clientId !== payload.clientId) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const document = {
      id: docRef.id,
      ...data,
      date: data.date?.toDate?.()?.toISOString?.() || null,
      dueDate: data.dueDate?.toDate?.()?.toISOString?.() || null,
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || null,
    };

    let client = null;
    let project = null;

    const clientSnap = await db.collection('clients').doc(data.clientId).get();
    if (clientSnap.exists) {
      const c = clientSnap.data()!;
      client = {
        id: clientSnap.id,
        ...c,
        createdAt: c.createdAt?.toDate?.()?.toISOString?.() || null,
        updatedAt: c.updatedAt?.toDate?.()?.toISOString?.() || null,
      };
    }

    if (data.projectId) {
      const projectSnap = await db.collection('projects').doc(data.projectId).get();
      if (projectSnap.exists) {
        const p = projectSnap.data()!;
        project = {
          id: projectSnap.id,
          ...p,
          startDate: p.startDate?.toDate?.()?.toISOString?.() || null,
          endDate: p.endDate?.toDate?.()?.toISOString?.() || null,
          createdAt: p.createdAt?.toDate?.()?.toISOString?.() || null,
          updatedAt: p.updatedAt?.toDate?.()?.toISOString?.() || null,
        };
      }
    }

    return NextResponse.json({ document, client, project });
  } catch (error) {
    console.error('[documents/id] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
