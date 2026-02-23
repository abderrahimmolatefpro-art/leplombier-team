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

    // Charger les projets
    const projectsSnap = await db
      .collection('projects')
      .where('clientId', '==', payload.clientId)
      .get();

    const projects = projectsSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        type: 'project' as const,
        title: data.title || 'Projet',
        description: data.description || '',
        status: data.status || 'en_attente',
        amount: data.amount || 0,
        projectType: data.type,
        startDate: data.startDate?.toDate?.()?.toISOString?.() || null,
        endDate: data.endDate?.toDate?.()?.toISOString?.() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || null,
      };
    });

    // Charger les dépannages (manualRevenues)
    const revenuesSnap = await db
      .collection('manualRevenues')
      .where('clientId', '==', payload.clientId)
      .get();

    const depannages = revenuesSnap.docs
      .filter((d) => {
        const data = d.data();
        if (data.deleted) return false;
        // Exclure les dépannages créés depuis une intervention instantanée (déjà affichés via instantRequests)
        if (data.instantRequestId) return false;
        return true;
      })
      .map((d) => {
      const data = d.data();
      return {
        id: d.id,
        type: 'depannage' as const,
        title: data.description || 'Dépannage',
        description: data.description || '',
        status: 'termine' as const,
        amount: data.amount || 0,
        projectType: null,
        startDate: data.date?.toDate?.()?.toISOString?.() || null,
        endDate: data.date?.toDate?.()?.toISOString?.() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || null,
      };
    });

    // Charger les demandes instantanées (interventions immédiates)
    const instantSnap = await db
      .collection('instantRequests')
      .where('clientId', '==', payload.clientId)
      .get();

    const instantRequests = instantSnap.docs.map((d) => {
      const data = d.data();
      const status = (data.status as string) || 'en_attente';
      const displayStatus =
        status === 'accepte' ? 'en_cours' : status === 'expire' ? 'termine' : status;
      return {
        id: d.id,
        type: 'intervention_instant' as const,
        title: data.address || 'Intervention instantanée',
        description: data.description || '',
        status: displayStatus,
        amount: data.clientProposedAmount ?? 0,
        projectType: null,
        startDate: data.createdAt?.toDate?.()?.toISOString?.() || null,
        endDate: data.acceptedAt?.toDate?.()?.toISOString?.() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || null,
        instantRequestId: d.id,
      };
    });

    const orders = [...projects, ...depannages, ...instantRequests].sort((a, b) => {
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate;
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('[orders] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
