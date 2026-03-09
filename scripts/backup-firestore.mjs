/**
 * Backup complet de Firestore en fichiers JSON locaux
 * Fonctionne avec le plan gratuit (Spark)
 *
 * Usage : node scripts/backup-firestore.mjs
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

// ─── Charger .env.local ──────────────────────────────────
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

// ─── Init Firebase Admin ─────────────────────────────────
if (!getApps().length) {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY manquant dans .env.local');
    process.exit(1);
  }
  const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  initializeApp({ credential: cert(sa) });
}

const db = getFirestore();

// ─── Collections à sauvegarder ───────────────────────────
const COLLECTIONS = [
  'users',
  'clients',
  'projects',
  'documents',
  'instantRequests',
  'instantOffers',
  'reviews',
  'manualRevenues',
  'plannings',
  'recruitments',
  'suppliers',
  'partRequests',
  'autoMessages',
  'sentMessages',
  'clientPromoCodes',
];

// ─── Convertir les types Firestore en JSON ───────────────
function serializeDoc(data) {
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      result[key] = value;
    } else if (value.toDate && typeof value.toDate === 'function') {
      // Firestore Timestamp → ISO string
      result[key] = value.toDate().toISOString();
    } else if (value._seconds !== undefined && value._nanoseconds !== undefined) {
      // Firestore Timestamp (serialized)
      result[key] = new Date(value._seconds * 1000).toISOString();
    } else if (Array.isArray(value)) {
      result[key] = value.map(v => {
        if (v && typeof v === 'object' && v.toDate) return v.toDate().toISOString();
        if (v && typeof v === 'object') return serializeDoc(v);
        return v;
      });
    } else if (typeof value === 'object') {
      result[key] = serializeDoc(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ─── Backup ──────────────────────────────────────────────
async function backup() {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  const backupDir = join('backups', `firestore-${timestamp}`);
  mkdirSync(backupDir, { recursive: true });

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║       BACKUP FIRESTORE → JSON LOCAL         ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`\n📁 Dossier : ${backupDir}\n`);

  let totalDocs = 0;

  for (const collectionName of COLLECTIONS) {
    try {
      const snapshot = await db.collection(collectionName).get();
      const docs = [];

      snapshot.forEach(doc => {
        docs.push({
          _id: doc.id,
          ...serializeDoc(doc.data()),
        });
      });

      const filePath = join(backupDir, `${collectionName}.json`);
      writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf-8');

      totalDocs += docs.length;
      const icon = docs.length > 0 ? '✅' : '⚠️';
      console.log(`  ${icon} ${collectionName.padEnd(20)} → ${docs.length} documents`);
    } catch (error) {
      console.log(`  ❌ ${collectionName.padEnd(20)} → Erreur: ${error.message}`);
    }
  }

  // ─── Résumé ────────────────────────────────────────────
  console.log('\n════════════════════════════════════════════════');
  console.log(`  Total : ${totalDocs} documents sauvegardés`);
  console.log(`  Dossier : ${backupDir}`);
  console.log('════════════════════════════════════════════════\n');

  // ─── Fichier metadata ─────────────────────────────────
  writeFileSync(join(backupDir, '_metadata.json'), JSON.stringify({
    date: new Date().toISOString(),
    collections: COLLECTIONS,
    totalDocuments: totalDocs,
  }, null, 2));

  console.log('💡 Pour restaurer : node scripts/restore-firestore.mjs ' + backupDir);
}

backup().catch(err => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});
