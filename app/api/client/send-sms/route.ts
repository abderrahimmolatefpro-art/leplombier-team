import { NextRequest, NextResponse } from 'next/server';

// Pour SMS, on peut utiliser plusieurs services :
// - Twilio (recommandé, payant mais fiable)
// - MessageBird
// - Vonage (ex-Nexmo)
// - Ou simplement ouvrir WhatsApp Web avec le numéro

// Import dynamique de Twilio pour éviter les erreurs si non installé
async function getTwilioClient() {
  try {
    const twilio = await import('twilio');
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return null;
    }
    return twilio.default(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  } catch (error) {
    console.error('Twilio not available:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:entry',message:'SMS API called',data:{hasAccountSid:!!process.env.TWILIO_ACCOUNT_SID,hasAuthToken:!!process.env.TWILIO_AUTH_TOKEN,hasPhoneNumber:!!process.env.TWILIO_PHONE_NUMBER},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    const body = await request.json();
    const { phone, message } = body;

    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:bodyParsed',message:'Request body parsed',data:{phone:phone?.substring(0,10)+'...',messageLength:message?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (!phone || !message) {
      return NextResponse.json(
        { success: false, error: 'Numéro de téléphone et message sont requis' },
        { status: 400 }
      );
    }

    // Option 1: Twilio (si configuré)
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:twilioConfig',message:'Twilio config detected',data:{accountSidPrefix:process.env.TWILIO_ACCOUNT_SID?.substring(0,5),phoneNumber:process.env.TWILIO_PHONE_NUMBER},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      try {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:twilioClient',message:'Creating Twilio client',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        
        const client = await getTwilioClient();
        
        if (!client) {
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:twilioNotAvailable',message:'Twilio client not available',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          // Twilio non disponible, on passe à WhatsApp
          const whatsappNumber = phone.replace(/[^0-9]/g, '');
          const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
          return NextResponse.json({
            success: true,
            message: 'URL WhatsApp générée (Twilio non disponible)',
            whatsappUrl: whatsappUrl,
            note: 'Twilio n&apos;est pas disponible. Vérifiez la configuration.',
          });
        }

        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:twilioSend',message:'Sending SMS via Twilio',data:{from:process.env.TWILIO_PHONE_NUMBER,to:phone?.substring(0,10)+'...',messageLength:message?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion

        const result = await client.messages.create({
          body: message,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: phone,
        });

        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:twilioSuccess',message:'SMS sent successfully',data:{sid:result?.sid},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion

        return NextResponse.json({
          success: true,
          message: 'SMS envoyé avec succès',
          sid: result.sid,
        });
      } catch (twilioError: any) {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:twilioSendError',message:'Twilio send error',data:{errorMessage:twilioError?.message,errorCode:twilioError?.code,errorStatus:twilioError?.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        console.error('Twilio error:', twilioError);
        return NextResponse.json(
          { 
            success: false, 
            error: twilioError.message || 'Erreur Twilio lors de l\'envoi du SMS',
            details: twilioError.code ? `Code: ${twilioError.code}` : undefined,
          },
          { status: 500 }
        );
      }
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
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:error',message:'Error caught',data:{errorMessage:error?.message,errorName:error?.name,errorStack:error?.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    console.error('Error sending SMS:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de l\'envoi du SMS' },
      { status: 500 }
    );
  }
}
