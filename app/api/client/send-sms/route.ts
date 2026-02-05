import { NextRequest, NextResponse } from 'next/server';

// Service SMS : Infobip
// Alternative : WhatsApp Web (redirection)

// Normaliser le numéro de téléphone au format E.164 (ex: +212612345678)
function normalizePhoneNumber(phone: string): string {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:normalizePhoneNumber:entry',message:'Normalizing phone number',data:{originalPhone:phone},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  // Nettoyer le numéro (garder seulement les chiffres et le +)
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:normalizePhoneNumber:cleaned',message:'Phone cleaned',data:{cleaned:cleaned},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  // Si le numéro commence déjà par +, le retourner tel quel
  if (cleaned.startsWith('+')) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:normalizePhoneNumber:alreadyPlus',message:'Phone already has + prefix',data:{normalized:cleaned},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return cleaned;
  }
  
  // Si le numéro commence par 00, remplacer par +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:normalizePhoneNumber:replaced00',message:'Replaced 00 with +',data:{normalized:cleaned},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return cleaned;
  }
  
  // Si le numéro commence par 0 (format local marocain), remplacer par +212
  if (cleaned.startsWith('0')) {
    cleaned = '+212' + cleaned.substring(1);
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:normalizePhoneNumber:replaced0',message:'Replaced 0 with +212',data:{normalized:cleaned},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return cleaned;
  }
  
  // Si le numéro commence par 212 (sans +), ajouter +
  if (cleaned.startsWith('212')) {
    cleaned = '+' + cleaned;
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:normalizePhoneNumber:addedPlus',message:'Added + to 212 prefix',data:{normalized:cleaned},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return cleaned;
  }
  
  // Si aucun préfixe, supposer que c'est un numéro marocain et ajouter +212
  // (format local sans 0 initial, ex: 612345678)
  if (cleaned.length >= 9 && cleaned.length <= 10) {
    cleaned = '+212' + cleaned;
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:normalizePhoneNumber:added212',message:'Added +212 prefix to local number',data:{normalized:cleaned},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return cleaned;
  }
  
  // Si le numéro est déjà dans un format international mais sans +, l'ajouter
  if (cleaned.length > 10) {
    cleaned = '+' + cleaned;
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:normalizePhoneNumber:addedPlusLong',message:'Added + to long number',data:{normalized:cleaned},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return cleaned;
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:normalizePhoneNumber:fallback',message:'Using original phone as fallback',data:{normalized:phone},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  // Fallback : retourner le numéro original avec + si pas déjà présent
  return phone.startsWith('+') ? phone : '+' + phone;
}

export async function POST(request: NextRequest) {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:entry',message:'SMS API called',data:{hasInfobipApiKey:!!process.env.INFOBIP_API_KEY,hasInfobipBaseUrl:!!process.env.INFOBIP_BASE_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
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

    // Option 1: Infobip (si configuré)
    if (process.env.INFOBIP_API_KEY && process.env.INFOBIP_BASE_URL) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:infobipConfig',message:'Infobip config detected',data:{baseUrl:process.env.INFOBIP_BASE_URL,apiKeyPrefix:process.env.INFOBIP_API_KEY?.substring(0,10)+'...'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      // Normaliser le numéro de téléphone au format E.164 (avant le try pour être accessible dans le catch)
      const normalizedPhone = normalizePhoneNumber(phone);
      
      try {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:infobipSend',message:'Sending SMS via Infobip',data:{toOriginal:phone,toNormalized:normalizedPhone,messageLength:message?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion

        // Construire l'URL complète (ajouter https:// si nécessaire)
        const baseUrl = process.env.INFOBIP_BASE_URL.startsWith('http') 
          ? process.env.INFOBIP_BASE_URL 
          : `https://${process.env.INFOBIP_BASE_URL}`;
        const apiUrl = `${baseUrl}/sms/2/text/single`;

        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:infobipRequest',message:'Infobip API request',data:{apiUrl:apiUrl,to:normalizedPhone},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `App ${process.env.INFOBIP_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.INFOBIP_SENDER || 'CRM',
            to: normalizedPhone,
            text: message,
          }),
        });

        const result = await response.json();

        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:infobipResponse',message:'Infobip API response',data:{status:response.status,statusText:response.statusText,result:result},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion

        if (!response.ok) {
          console.error('Infobip error:', result);
          return NextResponse.json(
            { 
              success: false, 
              error: result.requestError?.serviceException?.text || result.requestError?.message || 'Erreur Infobip lors de l\'envoi du SMS',
              details: result.requestError ? JSON.stringify(result.requestError, null, 2) : undefined,
              status: response.status,
            },
            { status: response.status }
          );
        }

        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:infobipSuccess',message:'SMS sent successfully via Infobip',data:{messageId:result?.messages?.[0]?.messageId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion

        return NextResponse.json({
          success: true,
          message: 'SMS envoyé avec succès',
          messageId: result.messages?.[0]?.messageId,
          status: result.messages?.[0]?.status,
        });
      } catch (infobipError: any) {
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:infobipSendError',message:'Infobip send error',data:{errorMessage:infobipError?.message,errorName:infobipError?.name,errorStack:infobipError?.stack?.substring(0,200),to:normalizedPhone},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        console.error('Infobip error:', infobipError);
        
        return NextResponse.json(
          { 
            success: false, 
            error: infobipError.message || 'Erreur Infobip lors de l\'envoi du SMS',
            details: infobipError.stack?.substring(0, 500),
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
      // Note: Pour un vrai envoi SMS, configurez Infobip
      note: 'Pour envoyer de vrais SMS, configurez Infobip dans les variables d\'environnement (INFOBIP_API_KEY, INFOBIP_BASE_URL)',
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
