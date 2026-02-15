import { normalizePhoneNumber } from './phone';

/**
 * Envoie un SMS via Infobip.
 * Retourne true si envoyé, false sinon (ne lance pas d'erreur).
 */
export async function sendSms(phone: string, message: string): Promise<boolean> {
  if (!process.env.INFOBIP_API_KEY || !process.env.INFOBIP_BASE_URL) {
    console.error('[sms] Infobip non configuré');
    return false;
  }

  const normalized = normalizePhoneNumber(phone);
  const baseUrl = process.env.INFOBIP_BASE_URL.startsWith('http')
    ? process.env.INFOBIP_BASE_URL
    : `https://${process.env.INFOBIP_BASE_URL}`;
  const apiUrl = `${baseUrl}/sms/2/text/advanced`;

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `App ${process.env.INFOBIP_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            destinations: [{ to: normalized }],
            from: process.env.INFOBIP_SENDER || 'Le Plombier',
            text: message,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error('[sms] Infobip error:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('[sms] Error:', error);
    return false;
  }
}
