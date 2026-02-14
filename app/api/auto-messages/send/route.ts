import { NextRequest, NextResponse } from 'next/server';
import { Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase-admin';
import { Project, ManualRevenue, AutoMessage, Client } from '@/types';

// Fonction pour envoyer un email
async function sendEmail(to: string, subject: string, content: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const response = await fetch(`${baseUrl}/api/client/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, message: content }),
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// Fonction pour envoyer un SMS
async function sendSMS(phone: string, message: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    const response = await fetch(`${baseUrl}/api/client/send-sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message }),
    });
    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
}

// Enregistrer un message envoyé
async function recordSentMessage(
  autoMessageId: string,
  clientId: string,
  type: 'sms' | 'email',
  status: 'sent' | 'failed',
  projectId?: string,
  manualRevenueId?: string,
  errorMessage?: string
) {
  try {
    const adminDb = getAdminDb();
    await adminDb.collection('sentMessages').add({
      autoMessageId,
      clientId,
      projectId: projectId || null,
      manualRevenueId: manualRevenueId || null,
      type,
      status,
      sentAt: AdminTimestamp.now(),
      errorMessage: errorMessage || null,
      createdAt: AdminTimestamp.now(),
    });
  } catch (error) {
    console.error('Error recording sent message:', error);
  }
}

function substituteVariables(
  text: string,
  client: Client,
  project?: Project | null,
  revenue?: ManualRevenue | null
): string {
  return text
    .replace(/\{\{clientName\}\}/g, client.name || 'Client')
    .replace(/\{\{projectTitle\}\}/g, project?.title || 'Intervention')
    .replace(/\{\{amount\}\}/g, project?.amount ? `${project.amount} MAD` : revenue?.amount ? `${revenue.amount} MAD` : '');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, clientIds, channels } = body as {
      messageId?: string;
      clientIds?: string[];
      channels?: { sms?: boolean; email?: boolean };
    };

    if (!messageId || !Array.isArray(clientIds) || !channels) {
      return NextResponse.json(
        { success: false, error: 'messageId, clientIds et channels requis' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    // Charger le message
    const messageDoc = await adminDb.collection('autoMessages').doc(messageId).get();
    if (!messageDoc.exists) {
      return NextResponse.json({ success: false, error: 'Message non trouvé' }, { status: 404 });
    }
    const autoMessage = { id: messageDoc.id, ...messageDoc.data() } as AutoMessage;

    // Charger les clients demandés
    const uniqueClientIds = [...new Set(clientIds)];
    const clients: Client[] = [];
    for (const id of uniqueClientIds) {
      const clientDoc = await adminDb.collection('clients').doc(id).get();
      if (clientDoc.exists) {
        clients.push({ id: clientDoc.id, ...clientDoc.data() } as Client);
      }
    }

    if (clients.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Aucun client valide à contacter',
        sent: 0,
        failed: 0,
      });
    }

    const sendSms = Boolean(channels.sms && autoMessage.smsEnabled && autoMessage.smsContent);
    const sendEmailCh = Boolean(channels.email && autoMessage.emailEnabled && autoMessage.emailSubject && autoMessage.emailContent);

    if (!sendSms && !sendEmailCh) {
      return NextResponse.json(
        { success: false, error: 'Aucun canal activé pour cet envoi (SMS ou Email)' },
        { status: 400 }
      );
    }

    let totalSent = 0;
    let totalFailed = 0;
    const details: { clientId: string; clientName: string; sms?: 'sent' | 'failed'; email?: 'sent' | 'failed' }[] = [];

    for (const client of clients) {
      // Récupérer le dernier projet terminé et le dernier dépannage pour les variables
      let lastProject: Project | null = null;
      let lastRevenue: ManualRevenue | null = null;

      const projectsSnap = await adminDb
        .collection('projects')
        .where('clientId', '==', client.id)
        .where('status', '==', 'termine')
        .get();
      const projectsSorted = projectsSnap.docs
        .map((doc) => {
          const d = doc.data();
          return { id: doc.id, ...d, endDate: d.endDate?.toDate(), updatedAt: d.updatedAt?.toDate() } as Project;
        })
        .filter((p) => p.endDate)
        .sort((a, b) => (b.endDate!.getTime() || 0) - (a.endDate!.getTime() || 0));
      if (projectsSorted.length > 0) lastProject = projectsSorted[0];

      const revenuesSnap = await adminDb.collection('manualRevenues').where('clientId', '==', client.id).get();
      const revenuesSorted = revenuesSnap.docs
        .filter((doc) => !doc.data().deleted)
        .map((doc) => {
          const d = doc.data();
          return { id: doc.id, ...d, date: d.date?.toDate(), createdAt: d.createdAt?.toDate(), updatedAt: d.updatedAt?.toDate() } as ManualRevenue;
        })
        .filter((r) => r.date)
        .sort((a, b) => (b.date!.getTime() || 0) - (a.date!.getTime() || 0));
      if (revenuesSorted.length > 0) lastRevenue = revenuesSorted[0];

      const clientDetail: (typeof details)[0] = { clientId: client.id, clientName: client.name || 'Client' };

      if (sendSms && client.phone) {
        const smsContent = substituteVariables(autoMessage.smsContent, client, lastProject, lastRevenue);
        const smsSuccess = await sendSMS(client.phone, smsContent);
        await recordSentMessage(
          autoMessage.id,
          client.id,
          'sms',
          smsSuccess ? 'sent' : 'failed',
          undefined,
          undefined,
          smsSuccess ? undefined : 'Erreur lors de l\'envoi SMS'
        );
        if (smsSuccess) totalSent++;
        else totalFailed++;
        clientDetail.sms = smsSuccess ? 'sent' : 'failed';
      }

      if (sendEmailCh && client.email) {
        const emailSubject = substituteVariables(autoMessage.emailSubject!, client, lastProject, lastRevenue);
        const emailContent = substituteVariables(autoMessage.emailContent!, client, lastProject, lastRevenue);
        const emailSuccess = await sendEmail(client.email, emailSubject, emailContent);
        await recordSentMessage(
          autoMessage.id,
          client.id,
          'email',
          emailSuccess ? 'sent' : 'failed',
          undefined,
          undefined,
          emailSuccess ? undefined : 'Erreur lors de l\'envoi email'
        );
        if (emailSuccess) totalSent++;
        else totalFailed++;
        clientDetail.email = emailSuccess ? 'sent' : 'failed';
      }

      details.push(clientDetail);
    }

    return NextResponse.json({
      success: true,
      message: `Messages envoyés: ${totalSent}, Échecs: ${totalFailed}`,
      sent: totalSent,
      failed: totalFailed,
      details,
    });
  } catch (error: any) {
    console.error('Error sending messages:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de l\'envoi des messages' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Utilisez POST pour envoyer des messages. Body: { messageId, clientIds, channels: { sms, email } }',
    endpoint: '/api/auto-messages/send',
  });
}
