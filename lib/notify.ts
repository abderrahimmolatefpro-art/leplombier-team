import { getAdminDb } from './firebase-admin';
import { sendPushToPlombier } from './fcm';
import { sendPushToClient } from './fcm';
import { sendWhatsApp, sendWhatsAppTemplate } from './whatsapp';
import type { PhoneCountry } from './phone';

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
  whatsappTemplate?: WhatsappTemplate,
  country: PhoneCountry = 'MA'
): Promise<void> {
  await sendPushToPlombier(plombierId, title, body, data);

  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(plombierId).get();
    const phone = userDoc.data()?.phone as string | undefined;
    const plombierCountry = (userDoc.data()?.country as PhoneCountry) || country;
    if (phone && phone.trim()) {
      if (whatsappTemplate) {
        sendWhatsAppTemplate(phone.trim(), whatsappTemplate.name, whatsappTemplate.params, plombierCountry).catch(
          () => {}
        );
      } else {
        sendWhatsApp(phone.trim(), body, plombierCountry).catch(() => {});
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
  whatsappTemplate?: WhatsappTemplate,
  country: PhoneCountry = 'MA'
): Promise<void> {
  await sendPushToClient(clientId, title, body);

  try {
    const db = getAdminDb();
    const clientDoc = await db.collection('clients').doc(clientId).get();
    const phone = clientDoc.data()?.phone as string | undefined;
    const clientCountry = (clientDoc.data()?.country as PhoneCountry) || country;
    if (phone && phone.trim()) {
      if (whatsappTemplate) {
        sendWhatsAppTemplate(phone.trim(), whatsappTemplate.name, whatsappTemplate.params, clientCountry).catch(
          () => {}
        );
      } else {
        sendWhatsApp(phone.trim(), body, clientCountry).catch(() => {});
      }
    }
  } catch {
    // Ignorer les erreurs WhatsApp
  }
}
