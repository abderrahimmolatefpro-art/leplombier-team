import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore, FieldValue, Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import { Project, ManualRevenue, AutoMessage, Client, SentMessage } from '@/types';

// Initialize Firebase Admin SDK
let adminApp: App;
let adminDb: Firestore;

if (!getApps().length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });
      adminDb = getFirestore(adminApp);
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      adminApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
      adminDb = getFirestore(adminApp);
    } else {
      throw new Error('Firebase Admin credentials not found');
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    adminApp = initializeApp();
    adminDb = getFirestore(adminApp);
  }
} else {
  adminApp = getApps()[0];
  adminDb = getFirestore(adminApp);
}

// Fonction pour envoyer un email
async function sendEmail(to: string, subject: string, content: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/client/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        subject,
        message: content,
      }),
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
    // Utiliser l'URL absolue si disponible, sinon utiliser l'URL relative
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL || process.env.NEXT_PUBLIC_BASE_URL}`
      : 'http://localhost:3000';
    const apiUrl = `${baseUrl}/api/client/send-sms`;
    
    console.log('Sending SMS to:', apiUrl, 'Phone:', phone.substring(0, 10) + '...');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone,
        message,
      }),
    });
    const data = await response.json();
    console.log('SMS response:', data);
    return data.success;
  } catch (error) {
    console.error('Error sending SMS:', error);
    return false;
  }
}

// Vérifier si un message a déjà été envoyé pour cette intervention
async function hasMessageBeenSent(
  autoMessageId: string,
  clientId: string,
  projectId?: string,
  manualRevenueId?: string
): Promise<boolean> {
  try {
    const sentMessagesSnapshot = await adminDb
      .collection('sentMessages')
      .where('autoMessageId', '==', autoMessageId)
      .where('clientId', '==', clientId)
      .get();
    
    return sentMessagesSnapshot.docs.some((doc) => {
      const data = doc.data();
      if (projectId && data.projectId === projectId) return true;
      if (manualRevenueId && data.manualRevenueId === manualRevenueId) return true;
      return false;
    });
  } catch (error) {
    console.error('Error checking sent messages:', error);
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

export async function POST(request: NextRequest) {
  try {
    // Récupérer tous les messages automatiques activés
    const autoMessagesSnapshot = await adminDb
      .collection('autoMessages')
      .where('enabled', '==', true)
      .get();
    const autoMessages = autoMessagesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as AutoMessage[];

    if (autoMessages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Aucun message automatique activé',
        sent: 0,
      });
    }

    // Récupérer tous les clients
    const clientsSnapshot = await adminDb.collection('clients').get();
    const clients = clientsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Client[];

    const clientsMap = new Map(clients.map((c) => [c.id, c]));

    let totalSent = 0;
    let totalFailed = 0;

    // Pour chaque message automatique
    for (const autoMessage of autoMessages) {
      const delayMs = autoMessage.delayHours * 60 * 60 * 1000;
      const targetDate = new Date(Date.now() - delayMs);

      // Vérifier les projets terminés
      const projectsSnapshot = await adminDb
        .collection('projects')
        .where('status', '==', 'termine')
        .get();
      const projects = projectsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          endDate: data.endDate?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        };
      }) as Project[];

      // Filtrer les projets terminés il y a X heures
      const eligibleProjects = projects.filter((project) => {
        if (!project.endDate && !project.updatedAt) return false;
        const completionDate = project.endDate || project.updatedAt;
        return completionDate && completionDate <= targetDate;
      });

      // Vérifier les dépannages (manualRevenues) - on considère qu'ils sont "terminés" à leur date
      const revenuesSnapshot = await adminDb.collection('manualRevenues').get();
      const revenues = revenuesSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          date: data.date?.toDate(),
        };
      }) as ManualRevenue[];

      // Filtrer les dépannages datant d'il y a X heures
      const eligibleRevenues = revenues.filter((revenue) => {
        if (!revenue.date) return false;
        return revenue.date <= targetDate;
      });

      // Envoyer les messages pour les projets
      for (const project of eligibleProjects) {
        const client = clientsMap.get(project.clientId);
        if (!client || !client.phone) continue;

        // Vérifier si le message a déjà été envoyé
        const alreadySent = await hasMessageBeenSent(autoMessage.id, client.id, project.id);
        if (alreadySent) continue;

        // Envoyer SMS si activé
        if (autoMessage.smsEnabled && autoMessage.smsContent) {
          // Remplacer les variables dynamiques
          let smsContent = autoMessage.smsContent
            .replace(/\{\{clientName\}\}/g, client.name || 'Client')
            .replace(/\{\{projectTitle\}\}/g, project.title || 'Intervention')
            .replace(/\{\{amount\}\}/g, project.amount ? `${project.amount} MAD` : '');
          const smsSuccess = await sendSMS(client.phone, smsContent);
          await recordSentMessage(
            autoMessage.id,
            client.id,
            'sms',
            smsSuccess ? 'sent' : 'failed',
            project.id,
            undefined,
            smsSuccess ? undefined : 'Erreur lors de l\'envoi SMS'
          );
          if (smsSuccess) totalSent++;
          else totalFailed++;
        }

        // Envoyer Email si activé
        if (autoMessage.emailEnabled && autoMessage.emailSubject && autoMessage.emailContent && client.email) {
          // Remplacer les variables dynamiques
          let emailSubject = autoMessage.emailSubject
            .replace(/\{\{clientName\}\}/g, client.name || 'Client')
            .replace(/\{\{projectTitle\}\}/g, project.title || 'Intervention')
            .replace(/\{\{amount\}\}/g, project.amount ? `${project.amount} MAD` : '');
          let emailContent = autoMessage.emailContent
            .replace(/\{\{clientName\}\}/g, client.name || 'Client')
            .replace(/\{\{projectTitle\}\}/g, project.title || 'Intervention')
            .replace(/\{\{amount\}\}/g, project.amount ? `${project.amount} MAD` : '');
          const emailSuccess = await sendEmail(
            client.email,
            emailSubject,
            emailContent
          );
          await recordSentMessage(
            autoMessage.id,
            client.id,
            'email',
            emailSuccess ? 'sent' : 'failed',
            project.id,
            undefined,
            emailSuccess ? undefined : 'Erreur lors de l\'envoi email'
          );
          if (emailSuccess) totalSent++;
          else totalFailed++;
        }
      }

      // Envoyer les messages pour les dépannages
      for (const revenue of eligibleRevenues) {
        const client = clientsMap.get(revenue.clientId);
        if (!client || !client.phone) continue;

        // Vérifier si le message a déjà été envoyé
        const alreadySent = await hasMessageBeenSent(autoMessage.id, client.id, undefined, revenue.id);
        if (alreadySent) continue;

        // Envoyer SMS si activé
        if (autoMessage.smsEnabled && autoMessage.smsContent) {
          // Remplacer les variables dynamiques
          let smsContent = autoMessage.smsContent
            .replace(/\{\{clientName\}\}/g, client.name || 'Client')
            .replace(/\{\{amount\}\}/g, revenue.amount ? `${revenue.amount} MAD` : '');
          const smsSuccess = await sendSMS(client.phone, smsContent);
          await recordSentMessage(
            autoMessage.id,
            client.id,
            'sms',
            smsSuccess ? 'sent' : 'failed',
            undefined,
            revenue.id,
            smsSuccess ? undefined : 'Erreur lors de l\'envoi SMS'
          );
          if (smsSuccess) totalSent++;
          else totalFailed++;
        }

        // Envoyer Email si activé
        if (autoMessage.emailEnabled && autoMessage.emailSubject && autoMessage.emailContent && client.email) {
          // Remplacer les variables dynamiques
          let emailSubject = autoMessage.emailSubject
            .replace(/\{\{clientName\}\}/g, client.name || 'Client')
            .replace(/\{\{amount\}\}/g, revenue.amount ? `${revenue.amount} MAD` : '');
          let emailContent = autoMessage.emailContent
            .replace(/\{\{clientName\}\}/g, client.name || 'Client')
            .replace(/\{\{amount\}\}/g, revenue.amount ? `${revenue.amount} MAD` : '');
          const emailSuccess = await sendEmail(
            client.email,
            emailSubject,
            emailContent
          );
          await recordSentMessage(
            autoMessage.id,
            client.id,
            'email',
            emailSuccess ? 'sent' : 'failed',
            undefined,
            revenue.id,
            emailSuccess ? undefined : 'Erreur lors de l\'envoi email'
          );
          if (emailSuccess) totalSent++;
          else totalFailed++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Messages envoyés: ${totalSent}, Échecs: ${totalFailed}`,
      sent: totalSent,
      failed: totalFailed,
    });
  } catch (error: any) {
    console.error('Error sending auto messages:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de l\'envoi des messages automatiques' },
      { status: 500 }
    );
  }
}

// GET pour tester manuellement
export async function GET() {
  return NextResponse.json({
    message: 'Utilisez POST pour déclencher l\'envoi des messages automatiques',
    endpoint: '/api/auto-messages/send',
  });
}
