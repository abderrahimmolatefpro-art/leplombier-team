import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import nodemailer from 'nodemailer';

const ZONE_LABELS: Record<string, string> = {
  casa: 'Casablanca',
  rabat: 'Rabat',
  tanger: 'Tanger',
  marrakech: 'Marrakech',
  agadir: 'Agadir',
  tetouan: 'Tétouan',
  fes: 'Fès',
};

// Initialize Firebase Admin SDK
let adminApp: App;
let adminDb: Firestore;

if (!getApps().length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });
      adminDb = getFirestore(adminApp);
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT_KEY not set. Webhook will not work.');
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
} else {
  adminApp = getApps()[0];
  adminDb = getFirestore(adminApp);
}

export async function POST(request: NextRequest) {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:40',message:'POST request received',data:{url:request.url,method:request.method},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  try {
    const body = await request.json();
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:43',message:'Body parsed',data:{hasBody:!!body,firstName:body?.firstName,lastName:body?.lastName,phone:body?.phone},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const { firstName, lastName, phone, specialty, zones, address, city, familySituation, hasTransport, experienceYears } = body;

    // Validation
    if (!firstName || !lastName || !phone || !specialty || !zones || !address) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:46',message:'Validation failed',data:{firstName:!!firstName,lastName:!!lastName,phone:!!phone,specialty:!!specialty,zones:!!zones,address:!!address},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: 'Tous les champs obligatoires doivent être remplis' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      );
    }

    if (!adminDb) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:53',message:'adminDb not initialized',data:{hasAdminDb:!!adminDb},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return NextResponse.json(
        { error: 'Service non configuré' },
        { 
          status: 500,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      );
    }

    // Check if recruitment already exists (by phone)
    const recruitmentQuery = await adminDb
      .collection('recruitments')
      .where('phone', '==', phone)
      .limit(1)
      .get();

    if (!recruitmentQuery.empty) {
      return NextResponse.json(
        { error: 'Une candidature avec ce numéro de téléphone existe déjà' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      );
    }

    // Create recruitment document
    const recruitmentData: Record<string, unknown> = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      specialty: specialty.trim(),
      zones: zones,
      address: address.trim(),
      status: 'pending',
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };
    if (city?.trim()) recruitmentData.city = city.trim();
    if (familySituation?.trim()) recruitmentData.familySituation = familySituation.trim();
    if (typeof hasTransport === 'boolean') recruitmentData.hasTransport = hasTransport;
    if (experienceYears !== undefined && experienceYears !== null && experienceYears !== '') {
      const years = typeof experienceYears === 'string' ? parseInt(experienceYears, 10) : Number(experienceYears);
      if (!isNaN(years)) recruitmentData.experienceYears = years;
    }

    await adminDb.collection('recruitments').add(recruitmentData);
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:87',message:'Recruitment saved to Firestore',data:{success:true},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Send email notification (optional)
    try {
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: process.env.NOTIFICATION_EMAIL || 'ogincema@gmail.com',
          subject: 'Nouvelle candidature - Recrutement',
          html: `
            <h2>Nouvelle candidature reçue</h2>
            <p><strong>Nom complet:</strong> ${firstName} ${lastName}</p>
            <p><strong>Téléphone:</strong> ${phone}</p>
            <p><strong>Spécialité:</strong> ${specialty}</p>
            <p><strong>Zone:</strong> ${ZONE_LABELS[zones] || zones}</p>
            <p><strong>Adresse:</strong> ${address}</p>
            ${city ? `<p><strong>Ville:</strong> ${city}</p>` : ''}
            ${familySituation ? `<p><strong>Situation familiale:</strong> ${familySituation}</p>` : ''}
            ${typeof hasTransport === 'boolean' ? `<p><strong>Moyen de transport:</strong> ${hasTransport ? 'Oui' : 'Non'}</p>` : ''}
            ${experienceYears !== undefined && experienceYears !== null && experienceYears !== '' ? `<p><strong>Années d'expérience:</strong> ${experienceYears}</p>` : ''}
            <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
          `,
        });
      }
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Continue even if email fails
    }

    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:122',message:'Returning success response',data:{status:200},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return NextResponse.json(
      { message: 'Candidature enregistrée avec succès' },
      { 
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7245/ingest/a6c00fac-488c-478e-8d12-9c269400222a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:126',message:'Error caught in POST handler',data:{errorMessage:error?.message,errorStack:error?.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    console.error('Error processing recruitment:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'enregistrement de la candidature' },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      }
    );
  }
}

// CORS headers
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
