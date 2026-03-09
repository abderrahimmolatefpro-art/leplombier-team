/**
 * Crée un plombier ES + un client ES de test dans Firebase Auth & Firestore
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Charger .env.local manuellement
const envContent = readFileSync('.env.local', 'utf-8');
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) return;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim();
  if (!process.env[key]) process.env[key] = val;
});

// Init Firebase Admin
function initAdmin() {
  if (getApps().length) return;
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    initializeApp({ credential: cert(sa) });
  } else {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY manquant dans .env.local');
  }
}

initAdmin();
const auth = getAuth();
const db = getFirestore();

// ============================================
// Config des comptes de test
// ============================================
const PLOMBIER = {
  email: 'plombier.es.test@leplombier.es',
  password: 'Test1234!',
  name: 'Carlos García',
  phone: '+34612345678',
  country: 'ES',
  city: 'Madrid',
};

const CLIENT = {
  name: 'María López',
  phone: '34687654321', // Format normalisé (sans +)
  country: 'ES',
  city: 'Madrid',
  address: 'Calle Gran Vía, 42',
  postalCode: '28013',
  email: 'maria.test@leplombier.es',
};

// Code d'accès pour le client (pour se connecter à l'espace client)
const CLIENT_ACCESS_CODE = '123456';

async function createPlombier() {
  console.log('\n🔧 Création du plombier ES...');

  // 1. Créer dans Firebase Auth
  let uid;
  try {
    const existing = await auth.getUserByEmail(PLOMBIER.email);
    uid = existing.uid;
    console.log(`   ⚡ Compte Auth existant : ${uid}`);
  } catch {
    const userRecord = await auth.createUser({
      email: PLOMBIER.email,
      password: PLOMBIER.password,
      displayName: PLOMBIER.name,
    });
    uid = userRecord.uid;
    console.log(`   ✅ Compte Auth créé : ${uid}`);
  }

  // 2. Créer/mettre à jour dans Firestore (collection users)
  await db.collection('users').doc(uid).set({
    email: PLOMBIER.email,
    name: PLOMBIER.name,
    phone: PLOMBIER.phone,
    role: 'plombier',
    country: PLOMBIER.country,
    city: PLOMBIER.city,
    availableForInstant: true,
    certified: true,
    validationStatus: 'validated',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log(`   ✅ Document Firestore créé dans users/${uid}`);
  return uid;
}

async function createClient() {
  console.log('\n👤 Création du client ES...');

  // Vérifier si le client existe déjà
  const snapshot = await db.collection('clients')
    .where('phone', '==', CLIENT.phone)
    .where('country', '==', 'ES')
    .get();

  let clientId;
  if (!snapshot.empty) {
    clientId = snapshot.docs[0].id;
    console.log(`   ⚡ Client existant : ${clientId}`);
  } else {
    const docRef = await db.collection('clients').add({
      name: CLIENT.name,
      phone: CLIENT.phone,
      email: CLIENT.email,
      address: CLIENT.address,
      city: CLIENT.city,
      postalCode: CLIENT.postalCode,
      country: CLIENT.country,
      clientType: 'particulier',
      companyName: '',
      ice: '',
      source: 'manual',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    clientId = docRef.id;
    console.log(`   ✅ Client créé : ${clientId}`);
  }

  // Mettre le code d'accès hashé (pour se connecter sans SMS)
  const crypto = await import('crypto');
  const accessCodeHash = crypto.createHash('sha256').update(CLIENT_ACCESS_CODE).digest('hex');
  await db.collection('clients').doc(clientId).update({
    accessCodeHash,
    accessCodeSentAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log(`   ✅ Code d'accès défini : ${CLIENT_ACCESS_CODE}`);

  return clientId;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║    Création des comptes de test Espagne (ES)        ║');
  console.log('╚══════════════════════════════════════════════════════╝');

  const plombierId = await createPlombier();
  const clientId = await createClient();

  console.log('\n');
  console.log('════════════════════════════════════════════════════════');
  console.log('  COMPTES CRÉÉS AVEC SUCCÈS');
  console.log('════════════════════════════════════════════════════════');
  console.log('');
  console.log('┌─────────────────────────────────────────────────────┐');
  console.log('│  PLOMBIER ES (Espace plombier)                     │');
  console.log('├─────────────────────────────────────────────────────┤');
  console.log(`│  Email    : ${PLOMBIER.email}        │`);
  console.log(`│  Mot de passe : ${PLOMBIER.password}                          │`);
  console.log(`│  Nom      : ${PLOMBIER.name}                       │`);
  console.log(`│  Tél      : ${PLOMBIER.phone}                     │`);
  console.log(`│  Ville    : ${PLOMBIER.city}                            │`);
  console.log(`│  UID      : ${plombierId}    │`);
  console.log('│                                                     │');
  console.log('│  URL : http://localhost:3002/espace-plombier/login  │');
  console.log('└─────────────────────────────────────────────────────┘');
  console.log('');
  console.log('┌─────────────────────────────────────────────────────┐');
  console.log('│  CLIENT ES (Espace client)                         │');
  console.log('├─────────────────────────────────────────────────────┤');
  console.log(`│  Téléphone : +34 687 654 321                       │`);
  console.log(`│  Code SMS  : ${CLIENT_ACCESS_CODE}                                │`);
  console.log(`│  Nom       : ${CLIENT.name}                         │`);
  console.log(`│  Ville     : ${CLIENT.city}                              │`);
  console.log(`│  ID        : ${clientId}    │`);
  console.log('│                                                     │');
  console.log('│  URL : http://localhost:3002/espace-client/login    │');
  console.log('│  Entrer le numéro : 687654321                      │');
  console.log('│  Puis le code : 123456                             │');
  console.log('└─────────────────────────────────────────────────────┘');
  console.log('');

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Erreur :', err.message);
  process.exit(1);
});
