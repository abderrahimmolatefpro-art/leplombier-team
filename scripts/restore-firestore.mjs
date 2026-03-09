/**
 * Restaurer un backup Firestore depuis les fichiers JSON locaux
 *
 * Usage : node scripts/restore-firestore.mjs backups/firestore-2026-03-09-14-30-00
 */
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync, readdirSync, existsSync } from 'fs';
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

// ─── Convertir les dates ISO en Firestore Timestamp ──────
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function deserializeDoc(data) {
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === '_id') continue; // Skip l'ID, c'est l'ID du document
    if (value === null || value === undefined) {
      result[key] = value;
    } else if (typeof value === 'string' && ISO_DATE_REGEX.test(value)) {
      result[key] = Timestamp.fromDate(new Date(value));
    } else if (Array.isArray(value)) {
      result[key] = value.map(v => {
        if (typeof v === 'string' && ISO_DATE_REGEX.test(v)) return Timestamp.fromDate(new Date(v));
        if (v && typeof v === 'object') return deserializeDoc(v);
        return v;
      });
    } else if (typeof value === 'object') {
      result[key] = deserializeDoc(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ─── Restore ─────────────────────────────────────────────
async function restore() {
  const backupDir = process.argv[2];

  if (!backupDir || !existsSync(backupDir)) {
    console.error('❌ Usage : node scripts/restore-firestore.mjs <dossier-backup>');
    console.error('   Exemple : node scripts/restore-firestore.mjs backups/firestore-2026-03-09-14-30-00');
    process.exit(1);
  }

  // Confirmation
  console.log('');
  console.log('⚠️  ATTENTION : Cette opération va ÉCRASER les données actuelles');
  console.log(`   avec le backup : ${backupDir}`);
  console.log('');
  console.log('   Appuyez sur Ctrl+C dans les 5 secondes pour annuler...');
  await new Promise(r => setTimeout(r, 5000));

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║       RESTAURATION FIRESTORE ← JSON         ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  const files = readdirSync(backupDir).filter(f => f.endsWith('.json') && !f.startsWith('_'));
  let totalDocs = 0;

  for (const file of files) {
    const collectionName = file.replace('.json', '');
    const filePath = join(backupDir, file);
    const docs = JSON.parse(readFileSync(filePath, 'utf-8'));

    let count = 0;
    // Écrire par batch de 500 (limite Firestore)
    const batchSize = 500;
    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = db.batch();
      const chunk = docs.slice(i, i + batchSize);

      for (const doc of chunk) {
        const docId = doc._id;
        const data = deserializeDoc(doc);
        batch.set(db.collection(collectionName).doc(docId), data);
        count++;
      }

      await batch.commit();
    }

    totalDocs += count;
    console.log(`  ✅ ${collectionName.padEnd(20)} → ${count} documents restaurés`);
  }

  console.log('\n════════════════════════════════════════════════');
  console.log(`  Total : ${totalDocs} documents restaurés`);
  console.log('════════════════════════════════════════════════\n');
}

restore().catch(err => {
  console.error('❌ Erreur:', err.message);
  process.exit(1);
});
