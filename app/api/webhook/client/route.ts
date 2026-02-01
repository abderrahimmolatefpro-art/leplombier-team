import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';

// Initialize Firebase Admin SDK (bypasses Firestore security rules)
let adminApp: App;
let adminDb: Firestore;

if (!getApps().length) {
  try {
    // Option 1: Use service account key file (recommended for production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });
      adminDb = getFirestore(adminApp);
    }
    // Option 2: Use individual credentials from env vars
    else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      adminApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
      adminDb = getFirestore(adminApp);
    }
    // Option 3: Use default credentials (for Vercel/Cloud environments)
    else if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      adminApp = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
      adminDb = getFirestore(adminApp);
    } else {
      console.warn('Firebase Admin SDK not configured. Webhook will not work.');
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    // Fallback: will fail gracefully if not configured
  }
} else {
  adminApp = getApps()[0];
  adminDb = getFirestore(adminApp);
}

// Email transporter configuration
const createTransporter = () => {
  // Option 1: Gmail SMTP (recommandé pour débuter)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  
  // Option 2: Service SMTP générique
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Send notification email
const sendNotificationEmail = async (clientData: any) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: 'ogincema@gmail.com',
      subject: `🎉 Nouveau client ajouté : ${clientData.name}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .info-box { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #3B82F6; }
            .label { font-weight: bold; color: #1e40af; margin-bottom: 5px; }
            .value { color: #333; margin-bottom: 15px; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Nouveau Client Ajouté</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Un nouveau contact a été ajouté via le formulaire web</p>
            </div>
            <div class="content">
              <div class="info-box">
                <div class="label">Nom complet</div>
                <div class="value">${clientData.name}</div>
              </div>
              
              ${clientData.email ? `
              <div class="info-box">
                <div class="label">Email</div>
                <div class="value">${clientData.email}</div>
              </div>
              ` : ''}
              
              <div class="info-box">
                <div class="label">Téléphone</div>
                <div class="value">${clientData.phone}</div>
              </div>
              
              ${clientData.address ? `
              <div class="info-box">
                <div class="label">Adresse</div>
                <div class="value">${clientData.address}</div>
              </div>
              ` : ''}
              
              ${clientData.city ? `
              <div class="info-box">
                <div class="label">Ville</div>
                <div class="value">${clientData.city}</div>
              </div>
              ` : ''}
              
              ${clientData.clientType ? `
              <div class="info-box">
                <div class="label">Type de client</div>
                <div class="value">${clientData.clientType === 'professionnel' ? 'Professionnel' : 'Particulier'}</div>
              </div>
              ` : ''}
              
              ${clientData.companyName ? `
              <div class="info-box">
                <div class="label">Nom de l'entreprise</div>
                <div class="value">${clientData.companyName}</div>
              </div>
              ` : ''}
              
              ${clientData.ice ? `
              <div class="info-box">
                <div class="label">ICE</div>
                <div class="value">${clientData.ice}</div>
              </div>
              ` : ''}
              
              ${clientData.message ? `
              <div class="info-box">
                <div class="label">Message</div>
                <div class="value">${clientData.message.replace(/\n/g, '<br>')}</div>
              </div>
              ` : ''}
              
              <div class="footer">
                <p>Ce message a été envoyé automatiquement depuis le CRM Plomberie</p>
                <p>Date: ${new Date().toLocaleString('fr-FR')}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Nouveau client ajouté : ${clientData.name}

Informations du client:
- Nom: ${clientData.name}
${clientData.email ? `- Email: ${clientData.email}\n` : ''}
- Téléphone: ${clientData.phone}
${clientData.address ? `- Adresse: ${clientData.address}\n` : ''}
${clientData.city ? `- Ville: ${clientData.city}\n` : ''}
${clientData.clientType ? `- Type: ${clientData.clientType === 'professionnel' ? 'Professionnel' : 'Particulier'}\n` : ''}
${clientData.companyName ? `- Entreprise: ${clientData.companyName}\n` : ''}
${clientData.ice ? `- ICE: ${clientData.ice}\n` : ''}
${clientData.message ? `- Message: ${clientData.message}\n` : ''}

Date: ${new Date().toLocaleString('fr-FR')}
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

export async function POST(request: NextRequest) {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/webhook/client/route.ts:POST',message:'Webhook called',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Vérifier la clé API secrète (optionnel mais recommandé)
    const apiKey = request.headers.get('x-api-key');
    if (process.env.WEBHOOK_API_KEY && apiKey !== process.env.WEBHOOK_API_KEY) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/webhook/client/route.ts:POST',message:'Invalid API key',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { success: false, error: 'Clé API invalide' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/webhook/client/route.ts:POST',message:'Request body received',data:{hasName:!!body.name,hasPhone:!!body.phone,hasEmail:!!body.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Validation des champs requis
    if (!body.name || !body.phone) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/webhook/client/route.ts:POST',message:'Validation failed',data:{hasName:!!body.name,hasPhone:!!body.phone},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      const response = NextResponse.json(
        { success: false, error: 'Le nom et le téléphone sont requis' },
        { status: 400 }
      );
      return addCorsHeaders(response);
    }

    // Vérifier si le client existe déjà (par téléphone ou email)
    let existingClient = null;
    
    if (body.phone) {
      const phoneQuery = adminDb.collection('clients').where('phone', '==', body.phone);
      const phoneSnapshot = await phoneQuery.get();
      if (!phoneSnapshot.empty) {
        existingClient = phoneSnapshot.docs[0];
      }
    }
    
    if (!existingClient && body.email) {
      const emailQuery = adminDb.collection('clients').where('email', '==', body.email);
      const emailSnapshot = await emailQuery.get();
      if (!emailSnapshot.empty) {
        existingClient = emailSnapshot.docs[0];
      }
    }

    // Préparer les données du client
    const clientData = {
      name: body.name.trim(),
      phone: body.phone.trim(),
      email: body.email?.trim() || '',
      address: body.address?.trim() || '',
      city: body.city?.trim() || '',
      postalCode: body.postalCode?.trim() || '',
      clientType: body.clientType || 'particulier',
      companyName: body.companyName?.trim() || '',
      ice: body.ice?.trim() || '',
      notes: body.message?.trim() || body.notes?.trim() || '',
      assignedPlombierId: body.assignedPlombierId || '',
      source: 'form', // Marquer comme créé via formulaire
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    let clientId: string;
    let isNew = false;

    if (existingClient) {
      // Client existant - mettre à jour
      clientId = existingClient.id;
      // Note: On ne met pas à jour ici pour éviter d'écraser les données existantes
      // On peut juste ajouter une note
      // await existingClient.ref.update({ ... });
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/webhook/client/route.ts:POST',message:'Existing client found',data:{clientId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    } else {
      // Nouveau client - créer
      const docRef = await adminDb.collection('clients').add(clientData);
      clientId = docRef.id;
      isNew = true;
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/webhook/client/route.ts:POST',message:'New client created',data:{clientId,name:clientData.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    }

    // Envoyer l'email de notification seulement si c'est un nouveau client
    if (isNew) {
      const emailSent = await sendNotificationEmail({
        ...clientData,
        message: body.message,
      });
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/webhook/client/route.ts:POST',message:'Email notification sent',data:{emailSent},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
    }

    const response = NextResponse.json({
      success: true,
      message: isNew ? 'Client créé avec succès' : 'Client existant trouvé',
      clientId,
      isNew,
    });
    return addCorsHeaders(response);
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api/webhook/client/route.ts:POST',message:'Error in webhook',data:{error:error?.message,stack:error?.stack},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    console.error('Error in webhook:', error);
    const response = NextResponse.json(
      { success: false, error: error.message || 'Erreur lors de la création du client' },
      { status: 500 }
    );
    return addCorsHeaders(response);
  }
}

// Allow CORS for WordPress
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
    },
  });
}

// Add CORS headers to POST response
function addCorsHeaders(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  return response;
}
