import { getAdminDb } from './firebase-admin';
import { sendPushToPlombier } from './fcm';
import { sendPushToClient } from './fcm';
import { sendWhatsApp } from './whatsapp';

/**
 * Notifie un plombier : FCM + WhatsApp (si téléphone disponible).
 */
export async function notifyPlombier(
  plombierId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  await sendPushToPlombier(plombierId, title, body, data);

  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(plombierId).get();
    const phone = userDoc.data()?.phone as string | undefined;
    if (phone && phone.trim()) {
      sendWhatsApp(phone.trim(), body).catch(() => {});
    }
  } catch {
    // Ignorer les erreurs WhatsApp
  }
}

/**
 * Notifie un client : FCM + WhatsApp (si téléphone disponible).
 */
export async function notifyClient(
  clientId: string,
  title: string,
  body: string
): Promise<void> {
  await sendPushToClient(clientId, title, body);

  try {
    const db = getAdminDb();
    const clientDoc = await db.collection('clients').doc(clientId).get();
    const phone = clientDoc.data()?.phone as string | undefined;
    if (phone && phone.trim()) {
      sendWhatsApp(phone.trim(), body).catch(() => {});
    }
  } catch {
    // Ignorer les erreurs WhatsApp
  }
}
