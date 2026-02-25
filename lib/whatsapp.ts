import { normalizePhoneNumber } from './phone';

/**
 * Envoie un message WhatsApp via Infobip.
 * Retourne true si envoyé, false sinon (ne lance pas d'erreur).
 */
export async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  if (!process.env.INFOBIP_API_KEY || !process.env.INFOBIP_BASE_URL) {
    console.error('[whatsapp] Infobip non configuré');
    return false;
  }

  const normalized = normalizePhoneNumber(phone);
  const baseUrl = process.env.INFOBIP_BASE_URL.startsWith('http')
    ? process.env.INFOBIP_BASE_URL
    : `https://${process.env.INFOBIP_BASE_URL}`;
  const sender = process.env.INFOBIP_WHATSAPP_SENDER || process.env.INFOBIP_SENDER || 'Le Plombier';
  const apiUrl = `${baseUrl}/whatsapp/1/message/text`;

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `App ${process.env.INFOBIP_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        from: sender,
        to: normalized,
        content: {
          text: message,
        },
      }),
    });

    if (!res.ok) {
      console.error('[whatsapp] Infobip error:', res.status, await res.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('[whatsapp] Error:', error);
    return false;
  }
}
