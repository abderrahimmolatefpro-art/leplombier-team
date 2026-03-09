/**
 * Génère un rapport PDF d'audit complet Multi-Pays (MA / ES)
 * avec le processus défini pour ajouter un futur pays
 */
import { jsPDF } from 'jspdf';
import { writeFileSync } from 'fs';

const doc = new jsPDF({ unit: 'mm', format: 'a4' });
const W = 210;
const H = 297;
const ML = 18; // marge gauche
const MR = 18;
const TW = W - ML - MR; // largeur texte
let y = 0;
let pageNum = 1;

// ─── Couleurs ──────────────────────────────────────────────
const BLUE   = [41, 98, 255];
const DARK   = [30, 30, 30];
const GRAY   = [100, 100, 100];
const LGRAY  = [160, 160, 160];
const GREEN  = [34, 150, 80];
const ORANGE = [220, 130, 30];
const RED    = [210, 50, 50];
const WHITE  = [255, 255, 255];
const BGLIGHT = [245, 247, 250];

// ─── Helpers ───────────────────────────────────────────────
function setColor(c) { doc.setTextColor(c[0], c[1], c[2]); }
function setFill(c) { doc.setFillColor(c[0], c[1], c[2]); }
function setDraw(c) { doc.setDrawColor(c[0], c[1], c[2]); }

function newPage() {
  doc.addPage();
  pageNum++;
  y = 20;
}

function ensureSpace(need) {
  if (y + need > H - 25) newPage();
}

function title(text, size = 16) {
  ensureSpace(14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(size);
  setColor(BLUE);
  doc.text(text, ML, y);
  y += size * 0.5 + 2;
  setDraw(BLUE);
  doc.setLineWidth(0.6);
  doc.line(ML, y, W - MR, y);
  y += 6;
}

function subtitle(text) {
  ensureSpace(10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  setColor(DARK);
  doc.text(text, ML, y);
  y += 6;
}

function body(text, indent = 0) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setColor(DARK);
  const lines = doc.splitTextToSize(text, TW - indent);
  for (const line of lines) {
    ensureSpace(5);
    doc.text(line, ML + indent, y);
    y += 4.2;
  }
  y += 1;
}

function bullet(text, indent = 4) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setColor(DARK);
  const lines = doc.splitTextToSize(text, TW - indent - 4);
  ensureSpace(5);
  doc.text('•', ML + indent, y);
  for (let i = 0; i < lines.length; i++) {
    ensureSpace(5);
    doc.text(lines[i], ML + indent + 4, y);
    y += 4.2;
  }
}

function numberedItem(num, text, indent = 4) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setColor(BLUE);
  ensureSpace(5);
  doc.text(`${num}.`, ML + indent, y);
  doc.setFont('helvetica', 'normal');
  setColor(DARK);
  const lines = doc.splitTextToSize(text, TW - indent - 8);
  for (let i = 0; i < lines.length; i++) {
    ensureSpace(5);
    doc.text(lines[i], ML + indent + 8, y);
    y += 4.2;
  }
}

function codeBlock(text) {
  ensureSpace(8);
  setFill(BGLIGHT);
  const lines = text.split('\n');
  const h = lines.length * 4.5 + 4;
  doc.roundedRect(ML + 2, y - 3, TW - 4, h, 2, 2, 'F');
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  setColor(DARK);
  for (const line of lines) {
    doc.text(line, ML + 6, y);
    y += 4.5;
  }
  y += 3;
  doc.setFont('helvetica', 'normal');
}

function statusBadge(status, text) {
  ensureSpace(6);
  const color = status === 'ok' ? GREEN : status === 'warn' ? ORANGE : RED;
  const label = status === 'ok' ? '✓ OK' : status === 'warn' ? '⚠ ATTENTION' : '✗ ERREUR';
  setFill(color);
  doc.roundedRect(ML + 4, y - 3.5, 22, 5, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  setColor(WHITE);
  doc.text(label, ML + 6, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setColor(DARK);
  doc.text(text, ML + 30, y);
  y += 6;
}

function tableRow(cols, widths, bold = false, bg = null) {
  ensureSpace(7);
  let x = ML;
  if (bg) {
    setFill(bg);
    doc.rect(ML, y - 4, TW, 6, 'F');
  }
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(8);
  setColor(bold ? WHITE : DARK);
  for (let i = 0; i < cols.length; i++) {
    doc.text(cols[i], x + 2, y);
    x += widths[i];
  }
  y += 5.5;
}

// ═══════════════════════════════════════════════════════════
// PAGE DE COUVERTURE
// ═══════════════════════════════════════════════════════════
setFill(BLUE);
doc.rect(0, 0, W, H, 'F');

doc.setFont('helvetica', 'bold');
doc.setFontSize(36);
setColor(WHITE);
doc.text('AUDIT MULTI-PAYS', W / 2, 80, { align: 'center' });

doc.setFontSize(20);
doc.text('MA (Maroc) / ES (Espagne)', W / 2, 95, { align: 'center' });

doc.setFont('helvetica', 'normal');
doc.setFontSize(14);
doc.text('CRM Plomberie — crm-plomberie', W / 2, 115, { align: 'center' });

setFill(WHITE);
doc.roundedRect(45, 135, 120, 55, 4, 4, 'F');
doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
setColor(BLUE);
doc.text('Contenu du rapport', W / 2, 148, { align: 'center' });
doc.setFont('helvetica', 'normal');
doc.setFontSize(9);
setColor(DARK);
const toc = [
  '1. Architecture multi-pays',
  '2. Fichiers de configuration centraux',
  '3. Audit complet des parties variables MA / ES',
  '4. Statut de chaque composant',
  '5. Points d\'amélioration restants',
  '6. Processus pour ajouter un nouveau pays',
  '7. Checklist nouveau pays',
];
let ty = 156;
for (const item of toc) {
  doc.text(item, 58, ty);
  ty += 5;
}

doc.setFontSize(10);
setColor(WHITE);
doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} — ${pageNum} pages`, W / 2, H - 20, { align: 'center' });

// ═══════════════════════════════════════════════════════════
// 1. ARCHITECTURE MULTI-PAYS
// ═══════════════════════════════════════════════════════════
newPage();
title('1. ARCHITECTURE MULTI-PAYS');

body('Le CRM Plomberie est une application Next.js 14 (App Router) multi-pays. Chaque entité (client, plombier, projet, document, demande instantanée) porte un champ « country » qui permet l\'isolation des données par pays.');

subtitle('1.1 Principe de fonctionnement');
bullet('Chaque document Firestore contient un champ country ("MA" ou "ES").');
bullet('Le CountryContext (côté admin) fournit selectedCountry et countryFilter pour filtrer les requêtes Firestore.');
bullet('Le domaine détermine le pays côté client : leplombier.ma → MA, leplombier.es → ES.');
bullet('Les dashboards admin dash.leplombier.ma et dash.leplombier.es redirigent automatiquement en fonction du pays sélectionné.');

subtitle('1.2 Stack technique');
bullet('Frontend : Next.js 14, TypeScript, TailwindCSS, Lucide Icons');
bullet('Backend : Firebase Auth + Firestore (NoSQL) — projet unique partagé');
bullet('SMS/WhatsApp/Email : Infobip (senders par pays)');
bullet('PDF : jsPDF + html2canvas avec labels par pays');
bullet('Mobile : Capacitor (iOS/Android)');
bullet('Domaines : leplombier.ma (MA), leplombier.es (ES)');

// ═══════════════════════════════════════════════════════════
// 2. FICHIERS DE CONFIGURATION CENTRAUX
// ═══════════════════════════════════════════════════════════
newPage();
title('2. FICHIERS DE CONFIGURATION CENTRAUX');

subtitle('2.1 types/index.ts — Types TypeScript');
body('Définit le type Country = "MA" | "ES" et l\'ajoute aux interfaces User, Client, InstantRequest, Document, Recruitment.');

subtitle('2.2 lib/companyConfig.ts — Configuration par pays');
body('Fichier central qui contient TOUTE la configuration variable entre pays :');
bullet('COUNTRY_CONFIG : devise, locale, région Google Maps, code postal par défaut, taux de TVA/IVA, label taxe');
bullet('SITE_CONFIG : URL et domaine du site web par pays');
bullet('companyInfoByCountry : nom, adresse, téléphone, email, site web, identifiants fiscaux (RC/ICE/Patente pour MA, CIF pour ES), tampon');
bullet('Fonctions : getCompanyInfo(country), formatCurrency(amount, country), getActiveCountry(), getWebsiteUrl(country)');

codeBlock(`COUNTRY_CONFIG = {
  MA: { currency: 'MAD', locale: 'fr-FR', taxRate: 0.20, taxLabel: 'TVA (20%)' },
  ES: { currency: 'EUR', locale: 'es-ES', taxRate: 0.21, taxLabel: 'IVA (21%)' },
}`);

subtitle('2.3 lib/pdfLabels.ts — Labels PDF par pays');
body('Labels de tous les éléments affichés sur les documents PDF (facture, devis, bon de commande) traduits en français (MA) et espagnol (ES).');

subtitle('2.4 lib/phone.ts — Normalisation téléphone');
body('Gère la normalisation des numéros de téléphone : +212 pour MA, +34 pour ES. Valide les formats locaux spécifiques à chaque pays.');

subtitle('2.5 lib/cities.ts — Listes de villes');
body('CITIES_MA (18 villes marocaines) et CITIES_ES (17 villes espagnoles). Fonction getCities(country) pour récupérer la liste appropriée.');

subtitle('2.6 lib/notificationMessages.ts — Messages push');
body('Messages FCM localisés : français pour MA, espagnol pour ES. Fonction getNotifMessage(type, country) pour récupérer le bon message.');

subtitle('2.7 lib/apiMessages.ts — Messages API');
body('Messages d\'erreur et templates SMS localisés par pays pour les endpoints d\'authentification client.');

// ═══════════════════════════════════════════════════════════
// 3. AUDIT COMPLET DES PARTIES VARIABLES
// ═══════════════════════════════════════════════════════════
newPage();
title('3. AUDIT COMPLET — PARTIES VARIABLES MA / ES');

body('Voici le tableau exhaustif de toutes les parties qui changent entre le Maroc et l\'Espagne dans l\'application :');
y += 2;

// Table header
const cols = ['Élément', 'Maroc (MA)', 'Espagne (ES)', 'Fichier'];
const ws = [35, 45, 45, 50];
tableRow(cols, ws, true, BLUE);

// Table rows
const rows = [
  ['Devise', 'MAD (DH)', 'EUR (€)', 'companyConfig.ts'],
  ['Locale', 'fr-FR', 'es-ES', 'companyConfig.ts'],
  ['Taux taxe', '20% (TVA)', '21% (IVA)', 'companyConfig.ts'],
  ['Label taxe', 'TVA (20%)', 'IVA (21%)', 'companyConfig.ts'],
  ['Préfixe tél.', '+212', '+34', 'phone.ts'],
  ['Domaine site', 'leplombier.ma', 'leplombier.es', 'companyConfig.ts'],
  ['Domaine dash', 'dash.leplombier.ma', 'dash.leplombier.es', 'Layout.tsx'],
  ['Email contact', 'contact@leplombier.ma', 'contact@leplombier.es', 'companyConfig.ts'],
  ['Email noreply', 'noreply@leplombier.ma', 'noreply@leplombier.es', 'email.ts'],
  ['Nom société', 'GROUPE OGINCE', 'GROUPE OGINCE ESPAÑA', 'companyConfig.ts'],
  ['Adresse siège', 'Casablanca', 'Madrid', 'companyConfig.ts'],
  ['ID fiscal 1', 'RC: 681785', 'CIF: B00000000', 'companyConfig.ts'],
  ['ID fiscal 2', 'ICE: 003755962...', '—', 'companyConfig.ts'],
  ['ID fiscal 3', 'Patente: 34214522', '—', 'companyConfig.ts'],
  ['SMS sender', 'Le Plombier', 'El Fontanero', 'sms.ts'],
  ['WhatsApp sender', 'INFOBIP_WA_SENDER', 'INFOBIP_WA_SENDER_ES', 'whatsapp.ts'],
  ['Template lang', 'fr', 'es', 'whatsapp.ts'],
  ['Google region', 'ma', 'es', 'companyConfig.ts'],
  ['Postal code', '20000', '28001', 'companyConfig.ts'],
  ['Villes', '18 villes (Casa...)', '17 villes (Madrid...)', 'cities.ts'],
  ['Loi fiscale', 'Art 89 CGI', 'Ley 37/1992 IVA', 'pdfLabels.ts'],
  ['Doc: Facture', 'FACTURE', 'FACTURA', 'DocumentView.tsx'],
  ['Doc: Devis', 'DEVIS', 'PRESUPUESTO', 'DocumentView.tsx'],
  ['Doc: Bon cmd', 'BON DE COMMANDE', 'PEDIDO', 'DocumentView.tsx'],
  ['Siège social', 'SIÈGE SOCIAL', 'DOMICILIO SOCIAL', 'DocumentView.tsx'],
  ['Signature', 'Signature', 'Firma', 'DocumentView.tsx'],
  ['Mentions', 'Mentions Légales', 'Información legal', 'DocumentView.tsx'],
  ['Notif push', 'Messages FR', 'Messages ES', 'notificationMessages.ts'],
  ['Messages API', 'Messages FR', 'Messages ES', 'apiMessages.ts'],
];

for (const row of rows) {
  ensureSpace(7);
  const bgRow = rows.indexOf(row) % 2 === 0 ? BGLIGHT : null;
  tableRow(row, ws, false, bgRow);
}

// ═══════════════════════════════════════════════════════════
// 4. STATUT DE CHAQUE COMPOSANT
// ═══════════════════════════════════════════════════════════
newPage();
title('4. STATUT PAR COMPOSANT');

subtitle('4.1 Configuration & Types');
statusBadge('ok', 'types/index.ts — Country type + champs country sur User, Client, Document');
statusBadge('ok', 'companyConfig.ts — Config complète MA/ES (devise, taxe, société)');
statusBadge('ok', 'pdfLabels.ts — Labels FR/ES pour tous les documents PDF');
statusBadge('ok', 'phone.ts — Normalisation +212/+34 correcte');
statusBadge('ok', 'cities.ts — Villes MA/ES séparées');
statusBadge('ok', 'CountryContext.tsx — Filtre admin MA/ES/ALL');

subtitle('4.2 Documents & Facturation');
statusBadge('ok', 'DocumentView.tsx — Affiche devise, taxe, labels, CIF/RC selon country');
statusBadge('ok', 'documents/[id]/page.tsx — Passe country et getCompanyInfo au DocumentView');
statusBadge('ok', 'espace-client/documents/[id]/page.tsx — Idem côté client');
statusBadge('ok', 'documents/page.tsx — Taux TVA/IVA dynamique selon pays du client');
statusBadge('ok', 'pdfGenerator.ts — PDF avec labels et devise par pays');

subtitle('4.3 Notifications');
statusBadge('ok', 'sms.ts — Sender par pays (Le Plombier / El Fontanero)');
statusBadge('ok', 'whatsapp.ts — Sender + template language par pays');
statusBadge('ok', 'email.ts — Domaine noreply dynamique par pays');
statusBadge('ok', 'notify.ts — Lit le country du plombier/client Firestore');
statusBadge('ok', 'notificationMessages.ts — Messages FR/ES');

subtitle('4.4 API Routes');
statusBadge('ok', 'send-code — Détection pays, SMS sender, messages traduits');
statusBadge('ok', 'verify — Requête par pays, messages traduits');
statusBadge('ok', 'instant-request — Géocodage, notifications par pays');
statusBadge('ok', 'instant-offer — Notifications par pays');

subtitle('4.5 Points d\'attention');
statusBadge('warn', 'webhook/client — Email notification hardcodé ogincema@gmail.com');
statusBadge('warn', 'email.ts — Locale date hardcodé fr-FR dans le template HTML');
statusBadge('warn', 'Capacitor (mobile) — Pas de config par pays, URL unique');
statusBadge('warn', '.env.local — Variables ES (INFOBIP_SENDER_ES, etc.) à configurer');
statusBadge('warn', 'Fournisseurs — Pas filtré par pays (collection partagée)');

// ═══════════════════════════════════════════════════════════
// 5. POINTS D'AMÉLIORATION RESTANTS
// ═══════════════════════════════════════════════════════════
newPage();
title('5. POINTS D\'AMÉLIORATION RESTANTS');

subtitle('5.1 Priorité haute');

numberedItem(1, 'Variables d\'environnement ES à configurer : INFOBIP_SENDER_ES, INFOBIP_WHATSAPP_SENDER_ES pour la production Espagne.');
numberedItem(2, 'Webhook client (api/webhook/client) : l\'email de notification admin est hardcodé à ogincema@gmail.com. Ajouter un mapping par pays dans companyConfig.ts.');
numberedItem(3, 'Template email HTML : la date est formatée en fr-FR même pour l\'Espagne. Utiliser COUNTRY_CONFIG[country].locale.');

subtitle('5.2 Priorité moyenne');

numberedItem(4, 'Application mobile (Capacitor) : l\'URL est unique (leplombier-team.vercel.app). Pour un déploiement multi-pays, prévoir un appId distinct et une URL par pays.');
numberedItem(5, 'Collection fournisseurs : pas de champ country, tous les fournisseurs sont visibles par les deux pays. Si nécessaire, ajouter le filtre.');
numberedItem(6, 'Détection pays côté API : basée sur le header host — fragile avec www., ports dev, etc. Rendre plus robuste.');

subtitle('5.3 Priorité basse');

numberedItem(7, 'Messages automatiques (AutoMessage) : pas de champ country. Si les templates doivent différer par pays, ajouter le champ.');
numberedItem(8, 'Zone de recrutement : le mapping ZONE_TO_CITY ne couvre que le Maroc. Ajouter un mapping pour les zones espagnoles.');
numberedItem(9, 'Projet Firebase unique : les deux pays partagent le même projet Firestore. Pour une isolation stricte (RGPD Espagne), envisager des projets séparés.');

// ═══════════════════════════════════════════════════════════
// 6. PROCESSUS POUR AJOUTER UN NOUVEAU PAYS
// ═══════════════════════════════════════════════════════════
newPage();
title('6. PROCESSUS POUR AJOUTER UN NOUVEAU PAYS');

body('Voici la procédure complète et détaillée pour ajouter un nouveau pays (exemple : PT — Portugal) au CRM Plomberie. Suivre les étapes dans l\'ordre.');
y += 3;

subtitle('ÉTAPE 1 — Types TypeScript');
body('Fichier : types/index.ts');
codeBlock(`// Avant :
export type Country = 'MA' | 'ES';
// Après :
export type Country = 'MA' | 'ES' | 'PT';`);
body('Ajouter les zones de recrutement du nouveau pays dans le type Recruitment.zones.');

subtitle('ÉTAPE 2 — Configuration pays (companyConfig.ts)');
body('Ajouter l\'entrée dans COUNTRY_CONFIG :');
codeBlock(`PT: {
  currency: 'EUR',
  locale: 'pt-PT',
  googleMapsRegion: 'pt',
  googlePlacesCountry: 'pt',
  defaultPostalCode: '1000-001',
  taxRate: 0.23,
  taxLabel: 'IVA (23%)',
},`);

body('Ajouter dans SITE_CONFIG :');
codeBlock(`PT: { websiteUrl: 'https://leplombier.pt', domain: 'leplombier.pt' },`);

body('Ajouter dans companyInfoByCountry :');
codeBlock(`PT: {
  name: 'GROUPE OGINCE PORTUGAL',
  address: 'Rua Exemplo, 1 - 1000-001 Lisboa',
  phone: '+351 900 000 000',
  email: 'contact@leplombier.pt',
  website: 'www.leplombier.pt',
  nif: '500000000',  // Ajouter le champ nif à CompanyInfo
  logo: '/logo.png',
  stamp: { name: 'GROUPE OGINCE PORTUGAL', address: 'Rua Exemplo, 1', city: 'Lisboa' },
},`);

newPage();
subtitle('ÉTAPE 3 — Labels PDF (pdfLabels.ts)');
body('Ajouter un objet de labels pour le nouveau pays :');
codeBlock(`PT: {
  facture: 'FATURA', devis: 'ORÇAMENTO', bon_commande: 'ENCOMENDA',
  taxLabel: 'IVA (23%)', siege: 'SEDE SOCIAL', signature: 'Assinatura',
  // ... etc.
},`);

subtitle('ÉTAPE 4 — Téléphone (phone.ts)');
body('Ajouter le pays au type PhoneCountry et à normalizePhoneNumber() :');
codeBlock(`// Ajouter le cas PT dans normalizePhoneNumber :
if (country === 'PT') {
  if (digits.startsWith('351')) return digits;
  if (digits.startsWith('00351')) return digits.slice(2);
  if (digits.length === 9) return '351' + digits;
}`);

subtitle('ÉTAPE 5 — Villes (cities.ts)');
body('Ajouter CITIES_PT et mettre à jour getCities() :');
codeBlock(`export const CITIES_PT = ['Lisboa','Porto','Braga','Coimbra','Faro',...];

export function getCities(country: Country): string[] {
  if (country === 'PT') return CITIES_PT;
  // ...
}`);

subtitle('ÉTAPE 6 — Messages localisés');
body('Fichiers à mettre à jour :');
bullet('lib/notificationMessages.ts : ajouter les messages push en portugais');
bullet('lib/apiMessages.ts : ajouter les messages d\'erreur et templates SMS en portugais');
bullet('lib/i18n.ts : ajouter le locale "pt" et les traductions');

subtitle('ÉTAPE 7 — SMS / WhatsApp / Email');
body('Fichiers à mettre à jour :');
bullet('lib/sms.ts : ajouter getSmsSender("PT") → "O Canalizador" (ou autre nom)');
bullet('lib/whatsapp.ts : ajouter sender PT et template language "pt"');
bullet('lib/email.ts : ajouter le domaine noreply@leplombier.pt');
bullet('.env.local : ajouter INFOBIP_SENDER_PT, INFOBIP_WHATSAPP_SENDER_PT');

newPage();
subtitle('ÉTAPE 8 — Documents (DocumentView.tsx)');
body('Le composant utilise déjà le paramètre country pour afficher les labels, devises et identifiants fiscaux. Vérifier :');
bullet('getDocumentTitle() : ajouter le cas PT (FATURA, ORÇAMENTO, ENCOMENDA)');
bullet('Footer : ajouter le cas PT pour afficher NIF au lieu de RC/CIF');
bullet('Mentions légales : ajouter la loi fiscale portugaise');

subtitle('ÉTAPE 9 — Layout admin (Layout.tsx)');
body('Ajouter le domaine dashboard :');
codeBlock(`const DASH_DOMAINS: Record<string, string> = {
  MA: 'dash.leplombier.ma',
  ES: 'dash.leplombier.es',
  PT: 'dash.leplombier.pt',  // Nouveau
};`);

subtitle('ÉTAPE 10 — CountryContext.tsx');
body('Ajouter "PT" aux options du sélecteur de pays dans le composant Layout, et dans le filtre countryFilter.');

subtitle('ÉTAPE 11 — API Routes');
body('Mettre à jour la détection de pays dans les routes API :');
bullet('api/espace-client/send-code : ajouter le check host includes "leplombier.pt"');
bullet('api/espace-client/verify : idem');
bullet('api/webhook/client : idem + email admin pour PT');

subtitle('ÉTAPE 12 — Infrastructure');
bullet('Configurer le DNS pour leplombier.pt et dash.leplombier.pt');
bullet('Mettre à jour next.config.js CSP pour ajouter les domaines PT');
bullet('Configurer les variables d\'environnement PT en production');
bullet('Si mobile : créer un appId Capacitor pour PT');

subtitle('ÉTAPE 13 — Test & Migration');
bullet('Exécuter un script de test (comme scripts/create-test-es.mjs) adapté pour PT');
bullet('Vérifier : login client PT, login plombier PT, création de document, PDF, notifications');
bullet('Si existants, migrer les documents sans country vers le bon pays');

// ═══════════════════════════════════════════════════════════
// 7. CHECKLIST NOUVEAU PAYS
// ═══════════════════════════════════════════════════════════
newPage();
title('7. CHECKLIST — AJOUT D\'UN NOUVEAU PAYS');

body('Cocher chaque étape une fois complétée :');
y += 3;

const checklist = [
  ['types/index.ts', 'Ajouter le code pays au type Country'],
  ['companyConfig.ts', 'Ajouter COUNTRY_CONFIG (devise, locale, taxe)'],
  ['companyConfig.ts', 'Ajouter SITE_CONFIG (domaine, URL)'],
  ['companyConfig.ts', 'Ajouter companyInfoByCountry (société, adresse, IDs fiscaux)'],
  ['companyConfig.ts', 'Ajouter nouveau champ ID fiscal à CompanyInfo si nécessaire'],
  ['pdfLabels.ts', 'Ajouter tous les labels PDF traduits'],
  ['phone.ts', 'Ajouter PhoneCountry + normalisation du préfixe'],
  ['cities.ts', 'Ajouter la liste des villes'],
  ['notificationMessages.ts', 'Ajouter les messages push traduits'],
  ['apiMessages.ts', 'Ajouter les messages API traduits'],
  ['i18n.ts', 'Ajouter le locale et les traductions'],
  ['sms.ts', 'Ajouter le sender SMS'],
  ['whatsapp.ts', 'Ajouter le sender WhatsApp + template language'],
  ['email.ts', 'Ajouter le domaine noreply'],
  ['DocumentView.tsx', 'Ajouter les titres et le footer du nouveau pays'],
  ['Layout.tsx', 'Ajouter le domaine dashboard'],
  ['CountryContext.tsx', 'Ajouter le pays au sélecteur'],
  ['API send-code', 'Ajouter la détection du domaine'],
  ['API verify', 'Ajouter la détection du domaine'],
  ['API webhook/client', 'Ajouter la détection + email admin'],
  ['next.config.js', 'Ajouter les domaines CSP'],
  ['.env.local', 'Configurer les variables INFOBIP_*_{PAYS}'],
  ['DNS', 'Configurer les domaines'],
  ['Test', 'Créer des comptes de test et vérifier tous les flux'],
];

const ckW = [42, 130];
tableRow(['Fichier', 'Action'], ckW, true, BLUE);
for (let i = 0; i < checklist.length; i++) {
  const bg = i % 2 === 0 ? BGLIGHT : null;
  tableRow([`☐  ${checklist[i][0]}`, checklist[i][1]], ckW, false, bg);
}

// ═══════════════════════════════════════════════════════════
// DERNIÈRE PAGE — RÉSUMÉ
// ═══════════════════════════════════════════════════════════
newPage();
title('RÉSUMÉ');

body('L\'implémentation multi-pays MA/ES du CRM Plomberie est complète et fonctionnelle. Voici le résumé :');
y += 3;

subtitle('Ce qui est fait (✓)');
bullet('Isolation des données par champ country sur chaque entité Firestore');
bullet('Devise dynamique : MAD pour MA, EUR pour ES');
bullet('Taux de taxe dynamique : TVA 20% pour MA, IVA 21% pour ES');
bullet('Labels PDF traduits (facture/factura, devis/presupuesto, etc.)');
bullet('Informations société par pays (nom, adresse, téléphone, identifiants fiscaux)');
bullet('Normalisation téléphone par pays (+212/+34)');
bullet('SMS et WhatsApp avec sender et langue par pays');
bullet('Email avec domaine dynamique par pays');
bullet('Messages de notification traduits (push, SMS, API)');
bullet('Villes et géocodage par pays');
bullet('Dashboard admin avec filtre par pays et redirection par domaine');
bullet('Documents (facture, devis, bon de commande) avec companyInfo et country dynamiques');

y += 3;
subtitle('Ce qui reste à configurer (⚠)');
bullet('Variables d\'environnement ES en production (INFOBIP_SENDER_ES, etc.)');
bullet('Email admin dans webhook/client — actuellement hardcodé');
bullet('Locale de date dans le template email HTML');
bullet('Configuration mobile Capacitor par pays (si nécessaire)');

y += 3;
subtitle('Processus futur (→)');
body('Le processus pour ajouter un nouveau pays est défini en 13 étapes claires avec une checklist de 24 points. Chaque nouveau pays nécessite des modifications dans environ 15 fichiers, tous identifiés dans ce rapport.');

y += 8;
setFill(BLUE);
doc.roundedRect(ML, y, TW, 12, 3, 3, 'F');
doc.setFont('helvetica', 'bold');
doc.setFontSize(11);
setColor(WHITE);
doc.text('Le CRM Plomberie est prêt pour le multi-pays.', W / 2, y + 7.5, { align: 'center' });

// ─── Numéros de page ───────────────────────────────────────
const totalPages = doc.getNumberOfPages();
for (let i = 2; i <= totalPages; i++) {
  doc.setPage(i);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(160, 160, 160);
  doc.text(`Page ${i - 1} / ${totalPages - 1}`, W / 2, H - 10, { align: 'center' });
  doc.text('CRM Plomberie — Audit Multi-Pays MA/ES', ML, H - 10);
}

// ─── Sauvegarder ───────────────────────────────────────────
const buffer = Buffer.from(doc.output('arraybuffer'));
const outputPath = 'public/audit-multi-pays-ma-es.pdf';
writeFileSync(outputPath, buffer);
console.log(`\n✅ Rapport PDF généré : ${outputPath}`);
console.log(`   ${totalPages - 1} pages`);
console.log(`   Ouvrir : open ${outputPath}`);
