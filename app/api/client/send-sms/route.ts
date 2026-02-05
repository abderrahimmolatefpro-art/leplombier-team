import { NextRequest, NextResponse } from 'next/server';

// Service SMS : Infobip
// Alternative : WhatsApp Web (redirection)

// Normaliser le numéro de téléphone pour Infobip (sans le +, ex: 212612345678)
function normalizePhoneNumber(phone: string): string {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:normalizePhoneNumber:entry',message:'Normalizing phone number',data:{originalPhone:phone},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  // Nettoyer le numéro (garder seulement les chiffres et le +)
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:normalizePhoneNumber:cleaned',message:'Phone cleaned',data:{cleaned:cleaned},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  // Si le numéro commence par +, retirer le + pour Infobip
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:normalizePhoneNumber:removedPlus',message:'Removed + prefix for Infobip',data:{normalized:cleaned},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return cleaned;
  }
  
  // Si le numéro commence par 00, remplacer par rien (garder juste les chiffres après 00)
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:normalizePhoneNumber:removed00',message:'Removed 00 prefix',data:{normalized:cleaned},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return cleaned;
  }
  
  // Si le numéro commence par 0 (format local marocain), remplacer par 212
  if (cleaned.startsWith('0')) {
    cleaned = '212' + cleaned.substring(1);
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:normalizePhoneNumber:replaced0',message:'Replaced 0 with 212',data:{normalized:cleaned},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return cleaned;
  }
  
  // Si le numéro commence déjà par 212, le retourner tel quel (sans +)
  if (cleaned.startsWith('212')) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:normalizePhoneNumber:already212',message:'Phone already has 212 prefix',data:{normalized:cleaned},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return cleaned;
  }
  
  // Si aucun préfixe, supposer que c'est un numéro marocain et ajouter 212
  // (format local sans 0 initial, ex: 612345678)
  if (cleaned.length >= 9 && cleaned.length <= 10) {
    cleaned = '212' + cleaned;
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:normalizePhoneNumber:added212',message:'Added 212 prefix to local number',data:{normalized:cleaned},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    return cleaned;
  }
  
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:normalizePhoneNumber:fallback',message:'Using cleaned phone as fallback',data:{normalized:cleaned},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  
  // Fallback : retourner le numéro nettoyé
  return cleaned;
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

        // Construire l'URL complète
        // Utiliser l'URL fournie par l'utilisateur (m9mmd2.api.infobip.com)
        const baseUrl = process.env.INFOBIP_BASE_URL.startsWith('http') 
          ? process.env.INFOBIP_BASE_URL 
          : `https://${process.env.INFOBIP_BASE_URL}`;
        const apiUrl = `${baseUrl}/sms/2/text/advanced`;

        // Format pour /sms/2/text/advanced
        const requestBody = {
          messages: [
            {
              destinations: [{ to: normalizedPhone }],
              from: process.env.INFOBIP_SENDER || 'CRM',
              text: message,
            },
          ],
        };

        const requestHeaders = {
          'Authorization': `App ${process.env.INFOBIP_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        };

        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:infobipRequestBefore',message:'About to call Infobip API',data:{apiUrl:apiUrl,baseUrl:process.env.INFOBIP_BASE_URL,requestBody:requestBody,hasApiKey:!!process.env.INFOBIP_API_KEY,apiKeyPrefix:process.env.INFOBIP_API_KEY?.substring(0,10)+'...',hasSender:!!process.env.INFOBIP_SENDER,sender:process.env.INFOBIP_SENDER},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion

        let response;
        let result;
        try {
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:infobipFetchStart',message:'Starting Infobip fetch',data:{apiUrl:apiUrl,requestBody:JSON.stringify(requestBody),requestHeaders:JSON.stringify(requestHeaders)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion

          response = await fetch(apiUrl, {
            method: 'POST',
            headers: requestHeaders,
            body: JSON.stringify(requestBody),
          });

          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:infobipFetchDone',message:'Infobip fetch completed',data:{status:response.status,statusText:response.statusText,ok:response.ok,headers:Object.fromEntries(response.headers.entries())},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion

          const responseText = await response.text();
          
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:infobipResponseText',message:'Infobip response text received',data:{responseText:responseText,responseTextLength:responseText.length,responseTextPreview:responseText.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion

          try {
            result = JSON.parse(responseText);
          } catch (parseError: any) {
            // #region agent log
            fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:infobipParseError',message:'Failed to parse Infobip response as JSON',data:{responseText:responseText,parseError:parseError?.message || String(parseError)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
            // #endregion
            result = { rawResponse: responseText, parseError: parseError?.message || String(parseError) };
          }
        } catch (fetchError: any) {
          // #region agent log
          fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:infobipFetchError',message:'Infobip fetch failed',data:{fetchError:fetchError?.message,fetchErrorName:fetchError?.name,fetchErrorCode:fetchError?.code,fetchErrorStack:fetchError?.stack?.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          console.error('Infobip fetch error:', fetchError);
          return NextResponse.json(
            { 
              success: false, 
              error: `Erreur lors de l'appel à Infobip: ${fetchError?.message || 'Erreur inconnue'}`,
              details: `Type: ${fetchError?.name || 'Unknown'}, Code: ${fetchError?.code || 'N/A'}`,
            },
            { status: 500 }
          );
        }

        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:infobipResponse',message:'Infobip API response parsed',data:{status:response.status,statusText:response.statusText,resultFull:JSON.stringify(result),resultMessages:result?.messages,resultRequestError:result?.requestError,hasMessages:!!result?.messages,messageCount:result?.messages?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
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

        // Vérifier le statut du message dans la réponse (même si HTTP 200)
        const messageStatus = result.messages?.[0]?.status;
        const messageId = result.messages?.[0]?.messageId;
        const messageError = result.messages?.[0]?.error;
        
        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:infobipMessageStatus',message:'Infobip message status check',data:{messageStatus:messageStatus,messageId:messageId,messageError:messageError,fullMessage:result?.messages?.[0]},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
        // #endregion

        // Si le statut indique une erreur (REJECTED, UNDELIVERABLE, etc.)
        if (messageStatus && ['REJECTED', 'UNDELIVERABLE', 'EXPIRED', 'CANCELED'].includes(messageStatus)) {
          console.error('Infobip message rejected:', result.messages[0]);
          return NextResponse.json(
            { 
              success: false, 
              error: `SMS rejeté par Infobip: ${messageStatus}`,
              details: messageError ? JSON.stringify(messageError, null, 2) : `Statut: ${messageStatus}. Message: ${result.messages[0]?.description || 'Aucune description'}`,
              messageId: messageId,
              status: messageStatus,
            },
            { status: 400 }
          );
        }

        // #region agent log
        fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'send-sms/route.ts:infobipSuccess',message:'SMS sent successfully via Infobip',data:{messageId:messageId,messageStatus:messageStatus,fullResponse:JSON.stringify(result)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion

        return NextResponse.json({
          success: true,
          message: 'SMS envoyé avec succès',
          messageId: messageId,
          status: messageStatus,
          details: result.messages?.[0] ? {
            to: result.messages[0].to,
            status: result.messages[0].status,
            description: result.messages[0].description,
          } : undefined,
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
