import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminApp, getAdminDb } from '@/lib/firebase-admin';
import { sendEmail } from '@/lib/email';
import { sendSms } from '@/lib/sms';

const URGENCY_LABELS: Record<string, string> = {
  normal: 'Normal',
  urgent: 'Urgent',
  tres_urgent: 'Très urgent',
};

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
      console.error('[api/part-requests/send-to-supplier] Firebase Admin init failed:', initError);
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

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID de demande requis' }, { status: 400 });
    }

    const requestRef = db.collection('partRequests').doc(id);
    const requestSnap = await requestRef.get();
    if (!requestSnap.exists) {
      return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 });
    }

    const requestData = requestSnap.data()!;
    const status = requestData.status;
    const supplierId = requestData.supplierId;

    if (status !== 'en_attente') {
      return NextResponse.json(
        { error: 'Seules les demandes en attente peuvent être envoyées au fournisseur' },
        { status: 400 }
      );
    }

    if (!supplierId) {
      return NextResponse.json(
        { error: 'Aucun fournisseur sélectionné pour cette demande' },
        { status: 400 }
      );
    }

    const supplierSnap = await db.collection('suppliers').doc(supplierId).get();
    if (!supplierSnap.exists) {
      return NextResponse.json({ error: 'Fournisseur introuvable' }, { status: 404 });
    }

    const supplierData = supplierSnap.data()!;
    if (!supplierData.enabled) {
      return NextResponse.json(
        { error: 'Ce fournisseur est désactivé' },
        { status: 400 }
      );
    }

    const plombierSnap = await db.collection('users').doc(requestData.plombierId).get();
    const plombierName = plombierSnap.exists ? plombierSnap.data()?.name || 'Plombier' : 'Plombier';

    const clientSnap = await db.collection('clients').doc(requestData.clientId).get();
    const clientName = clientSnap.exists ? clientSnap.data()?.name || 'Client' : 'Client';

    const urgencyLabel = URGENCY_LABELS[requestData.urgency] || requestData.urgency;
    const createdAt = requestData.createdAt?.toDate?.();
    const dateStr = createdAt ? createdAt.toLocaleDateString('fr-FR') : '';

    const description = requestData.description || '';
    const quantity = requestData.quantity ? `Quantité: ${requestData.quantity}\n` : '';

    const emailSubject = `[Le Plombier] Demande de pièces - ${clientName} - ${urgencyLabel}`;
    const emailBody = `Demande de pièces de la part de Le Plombier

Plombier: ${plombierName}
Client: ${clientName}
Date: ${dateStr}
Urgence: ${urgencyLabel}

Pièces demandées:
${description}
${quantity}

---
Ce message a été envoyé automatiquement par le CRM Le Plombier.`;

    const smsBody = `[Le Plombier] Demande pièces - ${clientName} - ${plombierName}
${description.slice(0, 100)}${description.length > 100 ? '...' : ''}
Urgence: ${urgencyLabel}`;

    const supplierEmail = (supplierData.email || '').trim();
    const supplierPhone = (supplierData.phone || '').trim();

    let emailSent = false;
    let smsSent = false;

    if (supplierEmail) {
      const emailResult = await sendEmail(supplierEmail, emailSubject, emailBody);
      emailSent = emailResult.success;
    }

    if (supplierPhone) {
      smsSent = await sendSms(supplierPhone, smsBody);
    }

    if (!emailSent && !smsSent) {
      return NextResponse.json(
        {
          error: 'Impossible d\'envoyer l\'email et le SMS. Vérifiez la configuration (Infobip/SMTP et Infobip SMS).',
        },
        { status: 500 }
      );
    }

    await requestRef.update({
      status: 'envoye',
      sentAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      emailSent,
      smsSent,
    });
  } catch (error) {
    console.error('[api/part-requests/send-to-supplier] Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
