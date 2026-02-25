import { normalizePhoneNumber } from './phone';

/**
 * Envoie un message WhatsApp texte via Infobip (fenêtre 24h).
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

/**
 * Envoie un message WhatsApp template via Infobip (hors fenêtre 24h).
 * @param templateName Nom du template approuvé (ex: demande_service_recue)
 * @param placeholders Valeurs pour {{1}}, {{2}}, etc. (dans l'ordre)
 */
export async function sendWhatsAppTemplate(
  phone: string,
  templateName: string,
  placeholders: string[] = []
): Promise<boolean> {
  if (!process.env.INFOBIP_API_KEY || !process.env.INFOBIP_BASE_URL) {
    console.error('[whatsapp] Infobip non configuré');
    return false;
  }

  const normalized = normalizePhoneNumber(phone);
  const baseUrl = process.env.INFOBIP_BASE_URL.startsWith('http')
    ? process.env.INFOBIP_BASE_URL
    : `https://${process.env.INFOBIP_BASE_URL}`;
  const sender = process.env.INFOBIP_WHATSAPP_SENDER || process.env.INFOBIP_SENDER || 'Le Plombier';

  // Infobip template endpoint (essayer les deux formats courants)
  const apiUrl = `${baseUrl}/whatsapp/1/message/template`;

  try {
    const content: Record<string, unknown> = {
      templateName,
      language: 'fr',
    };
    if (placeholders.length > 0) {
      content.templateData = {
        body: {
          placeholders,
        },
      };
    }

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
        content,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[whatsapp] Template error:', res.status, errText);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[whatsapp] Template Error:', error);
    return false;
  }
}
