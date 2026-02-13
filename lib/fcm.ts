import { getMessaging } from 'firebase-admin/messaging';
import { getAdminDb } from './firebase-admin';

export async function sendPushToPlombier(
  plombierId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  try {
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(plombierId).get();
    const token = userDoc.data()?.fcmToken as string | undefined;
    if (!token) {
      console.warn('[FCM] sendPushToPlombier: pas de fcmToken pour plombier', plombierId);
      return;
    }
    const messaging = getMessaging();
    const message: Parameters<typeof messaging.send>[0] = {
      token,
      notification: { title, body },
      android: {
        priority: 'high' as const,
        notification: {
          channelId: 'high_importance_channel',
          priority: 'high' as const,
        },
      },
    };
    if (data) message.data = data;
    await messaging.send(message);
    console.log('[FCM] sendPushToPlombier OK:', plombierId);
  } catch (err) {
    console.error('[FCM] sendPushToPlombier error:', plombierId, err);
  }
}

export async function sendPushToClient(
  clientId: string,
  title: string,
  body: string
): Promise<void> {
  try {
    const db = getAdminDb();
    const clientDoc = await db.collection('clients').doc(clientId).get();
    const token = clientDoc.data()?.fcmToken as string | undefined;
    if (!token) return;
    const messaging = getMessaging();
    await messaging.send({
      token,
      notification: { title, body },
    });
  } catch (err) {
    console.error('[FCM] sendPushToClient error:', err);
  }
}
