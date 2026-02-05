/**
 * Utilitaire pour l'envoi d'emails via Infobip (priorité) ou SMTP (fallback)
 */

// Template HTML pour les emails
export function createEmailTemplate(subject: string, message: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
        .message { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #3B82F6; white-space: pre-wrap; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">${subject}</h1>
        </div>
        <div class="content">
          <div class="message">
            ${message.replace(/\n/g, '<br>')}
          </div>
          <div class="footer">
            <p>Ce message a été envoyé depuis le CRM Plomberie</p>
            <p>Date: ${new Date().toLocaleString('fr-FR')}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Envoie un email via Infobip (priorité) ou SMTP (fallback)
 */
export async function sendEmail(
  to: string,
  subject: string,
  message: string,
  options?: {
    html?: string;
    from?: string;
  }
): Promise<{ success: boolean; error?: string; method?: string }> {
  // Option 1: Infobip Email API (si configuré)
  if (process.env.INFOBIP_API_KEY && process.env.INFOBIP_BASE_URL) {
    try {
      const baseUrl = process.env.INFOBIP_BASE_URL.startsWith('http')
        ? process.env.INFOBIP_BASE_URL
        : `https://${process.env.INFOBIP_BASE_URL}`;
      const apiUrl = `${baseUrl}/email/3/send`;

      const htmlContent = options?.html || createEmailTemplate(subject, message);
      const fromEmail = options?.from || process.env.INFOBIP_EMAIL_FROM || process.env.INFOBIP_SENDER || 'noreply@leplombier.ma';

      const requestBody = {
        from: fromEmail,
        to: to,
        subject: subject,
        html: htmlContent,
        text: message,
      };

      const requestHeaders = {
        'Authorization': `App ${process.env.INFOBIP_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

      console.log('📤 [EMAIL] Envoi via Infobip:', { to, subject, from: fromEmail });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      let result;
      
      try {
        result = JSON.parse(responseText);
      } catch (parseError: any) {
        console.error('❌ [EMAIL] Erreur de parsing JSON Infobip:', responseText);
        throw new Error(`Erreur de parsing: ${parseError?.message || String(parseError)}`);
      }

      if (!response.ok) {
        console.error('❌ [EMAIL] Erreur HTTP Infobip:', { status: response.status, result });
        throw new Error(`Erreur Infobip: ${result.requestError?.serviceException?.text || result.requestError?.message || 'Erreur inconnue'}`);
      }

      console.log('✅ [EMAIL] Email envoyé avec succès via Infobip.');
      return { success: true, method: 'Infobip' };
    } catch (infobipError: any) {
      console.error('❌ [EMAIL] Erreur Infobip:', infobipError?.message);
      // Continue vers le fallback SMTP
      console.warn('⚠️ [EMAIL] Fallback vers SMTP...');
    }
  }

  // Option 2: SMTP (fallback si Infobip non configuré ou en cas d'erreur)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = require('nodemailer');
      
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const htmlContent = options?.html || createEmailTemplate(subject, message);
      
      await transporter.sendMail({
        from: options?.from || process.env.SMTP_FROM || process.env.SMTP_USER,
        to: to,
        subject: subject,
        html: htmlContent,
        text: message,
      });

      console.log('✅ [EMAIL] Email envoyé avec succès via SMTP.');
      return { success: true, method: 'SMTP' };
    } catch (smtpError: any) {
      console.error('❌ [EMAIL] Erreur SMTP:', smtpError?.message);
      return { success: false, error: smtpError?.message || 'Erreur lors de l\'envoi via SMTP' };
    }
  }

  // Aucune méthode disponible
  return {
    success: false,
    error: 'Aucune méthode d\'envoi d\'email configurée. Configurez Infobip (INFOBIP_API_KEY, INFOBIP_BASE_URL) ou SMTP (SMTP_HOST, SMTP_USER, SMTP_PASS)',
  };
}
