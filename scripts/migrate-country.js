/**
 * Migration : ajouter country: 'MA' aux clients et plombiers sans country
 * Usage: node scripts/migrate-country.js
 * Prérequis: .env.local avec FIREBASE_SERVICE_ACCOUNT_KEY ou FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 */

const fs = require('fs');
const path = require('path');

// Charger .env.local si présent
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const key = m[1].trim();
      const val = m[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  });
}

const admin = require('firebase-admin');
const { FieldValue } = require('firebase-admin/firestore');

async function migrate() {
  if (!admin.apps?.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } else if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      admin.initializeApp({ projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
    } else {
      console.error('Firebase Admin non configuré. Définissez FIREBASE_SERVICE_ACCOUNT_KEY ou FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY dans .env.local');
      process.exit(1);
    }
  }

  const db = admin.firestore();
  let clientsUpdated = 0;
  let usersUpdated = 0;
  let instantRequestsUpdated = 0;
  let recruitmentsUpdated = 0;

  // Clients
  const clientsSnap = await db.collection('clients').get();
  for (const doc of clientsSnap.docs) {
    const data = doc.data();
    if (data.country === undefined || data.country === null) {
      await doc.ref.update({
        country: 'MA',
        updatedAt: FieldValue.serverTimestamp(),
      });
      clientsUpdated++;
      console.log('Client mis à jour:', doc.id);
    }
  }

  // Users (plombiers uniquement, pas les admins)
  const usersSnap = await db.collection('users').get();
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    if (data.role === 'admin') continue;
    if (data.country === undefined || data.country === null) {
      await doc.ref.update({
        country: 'MA',
        updatedAt: FieldValue.serverTimestamp(),
      });
      usersUpdated++;
      console.log('Plombier mis à jour:', doc.id);
    }
  }

  // InstantRequests (interventions instantanées) — country hérité du client ou MA par défaut
  const instantSnap = await db.collection('instantRequests').get();
  for (const doc of instantSnap.docs) {
    const data = doc.data();
    if (data.country === undefined || data.country === null) {
      let country = 'MA';
      if (data.clientId) {
        const clientDoc = await db.collection('clients').doc(data.clientId).get();
        if (clientDoc.exists && clientDoc.data()?.country) {
          country = clientDoc.data().country;
        }
      }
      await doc.ref.update({
        country,
        updatedAt: FieldValue.serverTimestamp(),
      });
      instantRequestsUpdated++;
      console.log('InstantRequest mis à jour:', doc.id);
    }
  }

  // Recruitments (candidatures) — MA par défaut (formulaire leplombier.ma)
  const recruitmentsSnap = await db.collection('recruitments').get();
  for (const doc of recruitmentsSnap.docs) {
    const data = doc.data();
    if (data.country === undefined || data.country === null) {
      await doc.ref.update({
        country: 'MA',
        updatedAt: FieldValue.serverTimestamp(),
      });
      recruitmentsUpdated++;
      console.log('Recruitment mis à jour:', doc.id);
    }
  }

  console.log('\nMigration terminée.');
  console.log('Clients mis à jour:', clientsUpdated);
  console.log('Plombiers mis à jour:', usersUpdated);
  console.log('InstantRequests mis à jour:', instantRequestsUpdated);
  console.log('Recruitments mis à jour:', recruitmentsUpdated);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
