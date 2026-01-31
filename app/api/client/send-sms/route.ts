import { NextRequest, NextResponse } from 'next/server';

// Pour SMS, on peut utiliser plusieurs services :
// - Twilio (recommandé, payant mais fiable)
// - MessageBird
// - Vonage (ex-Nexmo)
// - Ou simplement ouvrir WhatsApp Web avec le numéro

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, message } = body;

    if (!phone || !message) {
      return NextResponse.json(
        { success: false, error: 'Numéro de téléphone et message sont requis' },
        { status: 400 }
      );
    }

    // Option 1: Twilio (si configuré)
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      // Twilio est optionnel - installer avec: npm install twilio
      let twilio: any;
      try {
        twilio = require('twilio');
      } catch (e) {
        // Twilio non installé, on passe à WhatsApp
        const whatsappNumber = phone.replace(/[^0-9]/g, '');
        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
        return NextResponse.json({
          success: true,
          message: 'URL WhatsApp générée (Twilio non installé)',
          whatsappUrl: whatsappUrl,
          note: 'Installez Twilio avec: npm install twilio pour envoyer de vrais SMS',
        });
      }
      
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

      const result = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });

      return NextResponse.json({
        success: true,
        message: 'SMS envoyé avec succès',
        sid: result.sid,
      });
    }

    // Option 2: WhatsApp Web (redirection)
    // On retourne une URL WhatsApp Web pour ouvrir dans le navigateur
    const whatsappNumber = phone.replace(/[^0-9]/g, ''); // Nettoyer le numéro
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

    return NextResponse.json({
      success: true,
      message: 'URL WhatsApp générée',
      whatsappUrl: whatsappUrl,
      // Note: Pour un vrai envoi SMS, configurez Twilio ou un autre service
      note: 'Pour envoyer de vrais SMS, configurez Twilio dans les variables d\'environnement',
    });
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de l\'envoi du SMS' },
      { status: 500 }
    );
  }
}
