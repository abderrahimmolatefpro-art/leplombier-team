import { getAdminDb } from './firebase-admin';
import { sendPushToPlombier } from './fcm';
import { sendPushToClient } from './fcm';
import { sendWhatsApp, sendWhatsAppTemplate } from './whatsapp';

export type WhatsappTemplate = {
  name: string;
  params: string[];
};

/**
 * Notifie un plombier : FCM + WhatsApp (template si fourni, sinon texte).
 */
export async function notifyPlombier(
  plombierId: string,
  title: string,
  body: string,
  data?: Record<string, string>,
  whatsappTemplate?: WhatsappTemplate
): Promise<void> {
  await sendPushToPlombier(plombierId, title, body, data);

  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(plombierId).get();
    const phone = userDoc.data()?.phone as string | undefined;
    if (phone && phone.trim()) {
      if (whatsappTemplate) {
        sendWhatsAppTemplate(phone.trim(), whatsappTemplate.name, whatsappTemplate.params).catch(
          () => {}
        );
      } else {
        sendWhatsApp(phone.trim(), body).catch(() => {});
      }
    }
  } catch {
    // Ignorer les erreurs WhatsApp
  }
}

/**
 * Notifie un client : FCM + WhatsApp (template si fourni, sinon texte).
 */
export async function notifyClient(
  clientId: string,
  title: string,
  body: string,
  whatsappTemplate?: WhatsappTemplate
): Promise<void> {
  await sendPushToClient(clientId, title, body);

  try {
    const db = getAdminDb();
    const clientDoc = await db.collection('clients').doc(clientId).get();
    const phone = clientDoc.data()?.phone as string | undefined;
    if (phone && phone.trim()) {
      if (whatsappTemplate) {
        sendWhatsAppTemplate(phone.trim(), whatsappTemplate.name, whatsappTemplate.params).catch(
          () => {}
        );
      } else {
        sendWhatsApp(phone.trim(), body).catch(() => {});
      }
    }
  } catch {
    // Ignorer les erreurs WhatsApp
  }
}
