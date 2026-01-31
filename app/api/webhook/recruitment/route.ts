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
  try {
    const body = await request.json();
    const { firstName, lastName, phone, specialty, zones, address } = body;

    // Validation
    if (!firstName || !lastName || !phone || !specialty || !zones || !address) {
      return NextResponse.json(
        { error: 'Tous les champs obligatoires doivent être remplis' },
        { status: 400 }
      );
    }

    if (!adminDb) {
      return NextResponse.json(
        { error: 'Service non configuré' },
        { status: 500 }
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
        { status: 400 }
      );
    }

    // Create recruitment document
    const recruitmentData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      specialty: specialty.trim(),
      zones: zones,
      address: address.trim(),
      status: 'pending', // pending, contacted, accepted, rejected
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    };

    await adminDb.collection('recruitments').add(recruitmentData);

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
            <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
          `,
        });
      }
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Continue even if email fails
    }

    return NextResponse.json(
      { message: 'Candidature enregistrée avec succès' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error processing recruitment:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'enregistrement de la candidature' },
      { status: 500 }
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
