import { jsPDF } from 'jspdf';
import fs from 'fs';

const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
const pageWidth = 210;
const margin = 20;
const contentWidth = pageWidth - 2 * margin;
let y = 0;
let pageNum = 1;

const colors = {
  primary: [37, 99, 235],
  danger: [220, 38, 38],
  warning: [234, 179, 8],
  success: [22, 163, 74],
  dark: [30, 30, 30],
  gray: [100, 100, 100],
  lightGray: [200, 200, 200],
  bg: [245, 247, 250],
  maGreen: [22, 163, 74],
  esOrange: [234, 88, 12],
};

function addPage() {
  doc.addPage();
  pageNum++;
  y = 20;
}

function checkSpace(needed) {
  if (y + needed > 275) {
    addPage();
  }
}

function title(text, size = 20) {
  checkSpace(20);
  doc.setFontSize(size);
  doc.setTextColor(...colors.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(text, margin, y);
  y += size * 0.5 + 2;
}

function subtitle(text, size = 13) {
  checkSpace(15);
  y += 4;
  doc.setFontSize(size);
  doc.setTextColor(...colors.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(text, margin, y);
  y += size * 0.45 + 2;
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + 40, y);
  y += 4;
}

function sectionTitle(text) {
  checkSpace(12);
  y += 2;
  doc.setFontSize(11);
  doc.setTextColor(...colors.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(text, margin + 2, y);
  y += 6;
}

function paragraph(text, indent = 0) {
  doc.setFontSize(9.5);
  doc.setTextColor(...colors.dark);
  doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(text, contentWidth - indent);
  for (const line of lines) {
    checkSpace(5);
    doc.text(line, margin + indent, y);
    y += 4.5;
  }
  y += 1;
}

function bullet(text, icon = '•', indent = 4) {
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.gray);
  checkSpace(5);
  doc.text(icon, margin + indent, y);
  doc.setTextColor(...colors.dark);
  const lines = doc.splitTextToSize(text, contentWidth - indent - 6);
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) checkSpace(5);
    doc.text(lines[i], margin + indent + 5, y);
    y += 4.5;
  }
}

function codeBlock(lines) {
  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...colors.gray);
  y += 2;
  // background
  const blockH = lines.length * 3.8 + 4;
  checkSpace(blockH + 2);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin + 2, y - 3, contentWidth - 4, blockH, 2, 2, 'F');
  y += 1;
  lines.forEach(line => {
    doc.text(line, margin + 6, y);
    y += 3.8;
  });
  y += 3;
  doc.setFont('helvetica', 'normal');
}

function infoBox(text, color = colors.primary) {
  checkSpace(16);
  doc.setFillColor(color[0], color[1], color[2], 0.1);
  const lines = doc.splitTextToSize(text, contentWidth - 14);
  const boxH = lines.length * 4.5 + 8;
  doc.setFillColor(240, 245, 255);
  doc.roundedRect(margin, y, contentWidth, boxH, 2, 2, 'F');
  doc.setDrawColor(...color);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin, y + boxH);
  y += 6;
  doc.setFontSize(9.5);
  doc.setTextColor(...color);
  doc.setFont('helvetica', 'bold');
  lines.forEach(line => {
    doc.text(line, margin + 5, y);
    y += 4.5;
  });
  y += 4;
}

function comparisonTable(headers, rows) {
  checkSpace(12 + rows.length * 8);
  const colW = [70, 45, 45];
  const startX = margin;

  // Header
  doc.setFillColor(...colors.primary);
  doc.rect(startX, y - 5, contentWidth, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  headers.forEach((h, i) => {
    doc.text(h, startX + (i === 0 ? 2 : colW[0] + (i - 1) * colW[1] + 2), y - 1);
  });
  y += 4;

  // Rows
  rows.forEach((row, rowIdx) => {
    checkSpace(8);
    if (rowIdx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(startX, y - 4, contentWidth, 7, 'F');
    }
    doc.setTextColor(...colors.dark);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    row.forEach((cell, i) => {
      const x = i === 0 ? startX + 2 : startX + colW[0] + (i - 1) * colW[1] + 2;
      const maxW = i === 0 ? colW[0] - 4 : colW[i] - 4;
      const truncated = doc.splitTextToSize(cell, maxW)[0];
      doc.text(truncated, x, y);
    });
    y += 7;
  });
  y += 3;
}

function statusBadge(text, color, xPos) {
  doc.setFillColor(...color);
  const w = doc.getTextWidth(text) + 6;
  doc.roundedRect(xPos, y - 3.5, w, 5, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(text, xPos + 3, y);
  return w;
}

function statusItem(status, statusColor, text) {
  checkSpace(8);
  const w = statusBadge(status, statusColor, margin);
  doc.setTextColor(...colors.dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const lines = doc.splitTextToSize(text, contentWidth - w - 6);
  for (let i = 0; i < lines.length; i++) {
    doc.text(lines[i], margin + w + 4, y);
    y += 4.5;
  }
  y += 1;
}

function separator() {
  y += 3;
  doc.setDrawColor(...colors.lightGray);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;
}

function flagBox(country, color, label) {
  const boxW = 25;
  doc.setFillColor(...color);
  doc.roundedRect(margin + (country === 'ES' ? 30 : 0), y, boxW, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(label, margin + (country === 'ES' ? 30 : 0) + boxW / 2, y + 5.5, { align: 'center' });
}

// ============================================================
// PAGE 1 - COVER
// ============================================================
y = 60;
doc.setFillColor(...colors.primary);
doc.rect(0, 0, pageWidth, 50, 'F');
doc.setTextColor(255, 255, 255);
doc.setFontSize(26);
doc.setFont('helvetica', 'bold');
doc.text('GUIDE MULTI-PAYS', pageWidth / 2, 20, { align: 'center' });
doc.setFontSize(14);
doc.text('Maroc (MA) & Espagne (ES)', pageWidth / 2, 30, { align: 'center' });
doc.setFontSize(10);
doc.setFont('helvetica', 'normal');
doc.text('CRM Plomberie - Guide complet pour debutant', pageWidth / 2, 40, { align: 'center' });

// Two flag badges
y = 65;
doc.setFillColor(...colors.maGreen);
doc.roundedRect(margin, y, 75, 18, 3, 3, 'F');
doc.setTextColor(255, 255, 255);
doc.setFontSize(16);
doc.setFont('helvetica', 'bold');
doc.text('MA', margin + 8, y + 12);
doc.setFontSize(9);
doc.setFont('helvetica', 'normal');
doc.text('Maroc', margin + 25, y + 8);
doc.text('MAD - Dirham', margin + 25, y + 14);

doc.setFillColor(...colors.esOrange);
doc.roundedRect(pageWidth - margin - 75, y, 75, 18, 3, 3, 'F');
doc.setTextColor(255, 255, 255);
doc.setFontSize(16);
doc.setFont('helvetica', 'bold');
doc.text('ES', pageWidth - margin - 67, y + 12);
doc.setFontSize(9);
doc.setFont('helvetica', 'normal');
doc.text('Espagne', pageWidth - margin - 50, y + 8);
doc.text('EUR - Euro', pageWidth - margin - 50, y + 14);

y = 100;
doc.setTextColor(...colors.dark);
doc.setFontSize(10);
doc.setFont('helvetica', 'normal');
doc.text('Date : 8 Mars 2026', margin, y); y += 6;
doc.text('Projet : crm-plomberie v1.0.0', margin, y); y += 6;
doc.text('Auteur : Claude Code (Opus 4.6)', margin, y); y += 15;

// Table of contents
subtitle('Sommaire');
const toc = [
  '1. Comment fonctionne le multi-pays ?',
  '2. Architecture : ou est le code ?',
  '3. Configuration par pays (companyConfig)',
  '4. Le Country Context (selection du pays)',
  '5. Authentification client (SMS par pays)',
  '6. Telephone : normalisation MA vs ES',
  '7. Devises et formatage des montants',
  '8. Documents PDF (factures, devis)',
  '9. Notifications : WhatsApp, SMS, Push',
  '10. Dashboard et filtrage des donnees',
  '11. Base de donnees Firestore',
  '12. Espace client & espace plombier',
  '13. Applications mobiles',
  '14. Corrections effectuees',
  '15. Points d\'amelioration restants',
  '16. Checklist pour ajouter un nouveau pays',
];
toc.forEach(item => {
  bullet(item, '-', 2);
});

// ============================================================
// PAGE 2 - COMMENT CA MARCHE
// ============================================================
addPage();
title('1. Comment fonctionne le multi-pays ?');

paragraph('Le CRM Plomberie est concu pour fonctionner dans plusieurs pays simultanement. Actuellement, deux pays sont supportes : le Maroc (MA) et l\'Espagne (ES). Voici le principe general :');
y += 2;

infoBox('Chaque donnee dans la base (client, plombier, projet) a un champ "country" qui indique a quel pays elle appartient. L\'interface admin peut filtrer par pays pour n\'afficher que les donnees du pays selectionne.');

sectionTitle('Le flux general');
bullet('1. L\'admin choisit un pays dans le selecteur (MA, ES ou Tous)');
bullet('2. Toutes les requetes Firestore filtrent par ce pays');
bullet('3. Les montants s\'affichent dans la bonne devise (MAD ou EUR)');
bullet('4. Les documents PDF utilisent les infos legales du pays');
bullet('5. Les SMS/WhatsApp normalisent le numero selon le pays');
bullet('6. L\'espace client detecte le pays via le nom de domaine (leplombier.ma ou leplombier.es)');
y += 3;

sectionTitle('Les deux domaines');
paragraph('Le systeme utilise deux domaines pour identifier automatiquement le pays du client :');
comparisonTable(
  ['', 'Maroc (MA)', 'Espagne (ES)'],
  [
    ['Domaine', 'leplombier.ma', 'leplombier.es'],
    ['Devise', 'MAD (Dirham)', 'EUR (Euro)'],
    ['Langue', 'Francais', 'Espagnol'],
    ['Indicatif tel.', '+212', '+34'],
    ['TVA', '20%', '21% (IVA)'],
    ['ID fiscal', 'ICE / RC / Patente', 'CIF'],
  ]
);

// ============================================================
// PAGE 3 - ARCHITECTURE
// ============================================================
addPage();
title('2. Architecture : ou est le code ?');

paragraph('Voici tous les fichiers impliques dans la gestion multi-pays. Pour un debutant, c\'est important de savoir ou chercher :');
y += 3;

sectionTitle('Fichiers de configuration');
codeBlock([
  'lib/companyConfig.ts     -> Infos entreprise par pays (nom, adresse, CIF/ICE)',
  'lib/pdfLabels.ts         -> Labels PDF traduits (FACTURE vs FACTURA)',
  'lib/pdfGenerator.ts      -> Generation PDF avec labels et devise par pays',
  'lib/services.ts          -> Services plomberie avec prix (devise dynamique)',
  'lib/phone.ts             -> Normalisation telephone (+212 / +34)',
  'lib/utils.ts             -> formatCurrency() selon le pays',
  'lib/apiMessages.ts       -> Messages API traduits par pays',
]);

sectionTitle('Fichiers de contexte et hooks');
codeBlock([
  'contexts/CountryContext.tsx  -> Selecteur de pays (MA / ES / ALL)',
  'hooks/useAuth.ts             -> Auth admin',
  'hooks/useClientAuth.ts       -> Auth client (SMS)',
  'hooks/usePlombierAuth.ts     -> Auth plombier',
]);

sectionTitle('Fichiers i18n (traductions)');
codeBlock([
  'messages/fr.json  -> Traductions en francais (interface MA)',
  'messages/es.json  -> Traductions en espagnol (interface ES)',
]);

sectionTitle('Routes API impactees');
codeBlock([
  'api/espace-client/send-code/    -> Envoi SMS avec normalisation par pays',
  'api/espace-client/verify/        -> Verification code par pays',
  'api/auto-messages/send/          -> Messages avec devise par pays',
  'api/espace-plombier/instant-*/   -> Demandes instantanees filtrees par pays',
]);

sectionTitle('Composants UI');
codeBlock([
  'components/Layout.tsx                  -> Selecteur de pays dans le menu',
  'components/DocumentView.tsx            -> Vue document avec devise/labels',
  'components/DescriptionWithSuggestions  -> Prix services avec devise',
]);

// ============================================================
// PAGE 4 - COMPANY CONFIG
// ============================================================
addPage();
title('3. Configuration par pays');

paragraph('Le fichier lib/companyConfig.ts est le coeur de la configuration multi-pays. Il contient toutes les informations specifiques a chaque pays.');
y += 2;

sectionTitle('Structure du fichier');
codeBlock([
  '// lib/companyConfig.ts',
  '',
  'export const COUNTRY_CONFIG = {',
  '  MA: {',
  '    currency: "MAD",        // Devise',
  '    locale: "fr-FR",        // Format des nombres',
  '    googleMapsRegion: "ma", // Region Google Maps',
  '    defaultPostalCode: "20000",',
  '  },',
  '  ES: {',
  '    currency: "EUR",',
  '    locale: "es-ES",',
  '    googleMapsRegion: "es",',
  '    defaultPostalCode: "28001",',
  '  },',
  '};',
]);
y += 2;

sectionTitle('Informations entreprise par pays');
codeBlock([
  'export const companyInfoByCountry = {',
  '  MA: {',
  '    name: "GROUPE OGINCE",',
  '    address: "Rue Essanaoubre... Casablanca",',
  '    phone: "+212 706 404 147",',
  '    rc: "681785",           // Registre du Commerce',
  '    ice: "003755962000004", // Identifiant Commun Entreprise',
  '    patente: "34214522",',
  '  },',
  '  ES: {',
  '    name: "GROUPE OGINCE ESPANA",',
  '    address: "Calle Ejemplo, 1 - 28001 Madrid",',
  '    phone: "+34 600 000 000",',
  '    cif: "B00000000",       // Codigo Identificacion Fiscal',
  '  },',
  '};',
]);

infoBox('IMPORTANT : Les informations ES sont des placeholders. Vous devez les remplacer par les vraies informations de votre entreprise en Espagne (adresse, telephone, CIF).', colors.warning);

sectionTitle('Fonctions utiles');
paragraph('Pour recuperer les informations du pays actif :');
codeBlock([
  'import { getCompanyInfo, formatCurrency } from "@/lib/companyConfig";',
  '',
  '// Obtenir les infos entreprise du pays',
  'const info = getCompanyInfo("ES");',
  'console.log(info.name);    // "GROUPE OGINCE ESPANA"',
  'console.log(info.cif);     // "B00000000"',
  '',
  '// Formater un montant',
  'formatCurrency(1500, "MA"); // "1 500,00 MAD"',
  'formatCurrency(1500, "ES"); // "1.500,00 EUR"',
]);

// ============================================================
// PAGE 5 - COUNTRY CONTEXT
// ============================================================
addPage();
title('4. Le Country Context');

paragraph('Le CountryContext est un "contexte React" qui permet a toute l\'application de savoir quel pays est selectionne. C\'est comme une variable globale accessible partout.');
y += 3;

sectionTitle('Comment ca marche ?');
codeBlock([
  '// contexts/CountryContext.tsx',
  '',
  '// 3 valeurs possibles :',
  '// "MA"  -> Affiche uniquement les donnees du Maroc',
  '// "ES"  -> Affiche uniquement les donnees d\'Espagne',
  '// "ALL" -> Affiche les donnees des deux pays',
  '',
  '// Le choix est sauvegarde dans localStorage',
  '// (persiste meme apres fermeture du navigateur)',
]);
y += 2;

sectionTitle('Utilisation dans un composant');
codeBlock([
  '// Dans n\'importe quel composant :',
  'import { useCountry } from "@/contexts/CountryContext";',
  '',
  'function MonComposant() {',
  '  const { selectedCountry, countryFilter } = useCountry();',
  '',
  '  // selectedCountry = "MA" | "ES" | "ALL"',
  '  // countryFilter   = ["MA"] | ["ES"] | ["MA", "ES"]',
  '',
  '  // Utiliser countryFilter dans une requete Firestore :',
  '  const q = query(',
  '    collection(db, "clients"),',
  '    where("country", "in", countryFilter)',
  '  );',
  '}',
]);
y += 2;

infoBox('Le countryFilter est un tableau qui est utilise avec l\'operateur "in" de Firestore. Si "ALL" est selectionne, le tableau contient ["MA", "ES"] pour recuperer les donnees des deux pays.');

sectionTitle('Ou se trouve le selecteur ?');
paragraph('Le selecteur de pays se trouve dans le composant Layout.tsx (le menu lateral). L\'admin peut cliquer sur le drapeau pour changer de pays. Ce choix impacte immediatement toutes les pages du dashboard.');

// ============================================================
// PAGE 6 - AUTH CLIENT
// ============================================================
addPage();
title('5. Authentification client par pays');

paragraph('Les clients se connectent via un code SMS envoye a leur numero de telephone. Le pays est detecte automatiquement ou envoye dans la requete.');
y += 3;

sectionTitle('Detection du pays');
codeBlock([
  '// Dans api/espace-client/send-code/route.ts :',
  '',
  '// 1. Priorite au body de la requete',
  'const country = bodyCountry === "ES" ? "ES"',
  '  // 2. Sinon, detection par le domaine',
  '  : request.headers.get("host")?.includes("leplombier.es")',
  '    ? "ES"',
  '    // 3. Par defaut : Maroc',
  '    : "MA";',
]);
y += 2;

sectionTitle('Flux d\'authentification');
bullet('1. Le client entre son numero sur leplombier.ma ou leplombier.es');
bullet('2. L\'API detecte le pays (MA ou ES) via le domaine ou le body');
bullet('3. Le numero est normalise selon le pays (+212... ou +34...)');
bullet('4. Un code a 6 chiffres est genere et hashe (SHA-256)');
bullet('5. Le code est envoye par SMS via Infobip');
bullet('6. Le client entre le code recu');
bullet('7. L\'API verifie le hash et genere un token JWT');
y += 3;

sectionTitle('Recherche du client dans Firestore');
paragraph('L\'API cherche d\'abord les clients du pays specifique, puis en fallback cherche parmi tous les clients (pour la retrocompatibilite avec les anciens clients sans champ country) :');
codeBlock([
  '// 1. Chercher dans les clients du pays',
  'let snapshot = await db.collection("clients")',
  '  .where("country", "==", country).get();',
  '',
  '// 2. Si pas trouve, fallback : chercher partout',
  'if (!clientDoc) {',
  '  snapshot = await db.collection("clients").get();',
  '  clientDoc = snapshot.docs.find(d => {',
  '    if (d.data().country && d.data().country !== country)',
  '      return false;  // Exclure les clients d\'un autre pays',
  '    // Comparer les numeros normalises',
  '  });',
  '}',
]);

// ============================================================
// PAGE 7 - TELEPHONE
// ============================================================
addPage();
title('6. Normalisation telephone');

paragraph('La normalisation des numeros de telephone est cruciale pour que les SMS et WhatsApp arrivent correctement. Chaque pays a un format different.');
y += 3;

sectionTitle('Le fichier lib/phone.ts');
paragraph('Ce fichier contient la fonction normalizePhoneNumber() qui convertit n\'importe quel format local en format international sans le "+" :');
y += 2;

comparisonTable(
  ['Format entre', 'Maroc (MA)', 'Espagne (ES)'],
  [
    ['Local', '0612345678', '612345678'],
    ['Avec +', '+212612345678', '+34612345678'],
    ['Avec 00', '00212612345678', '0034612345678'],
    ['Resultat normalise', '212612345678', '34612345678'],
  ]
);

sectionTitle('Regles de normalisation');
codeBlock([
  'function normalizePhoneNumber(phone, country = "MA") {',
  '  // 1. Nettoyer : garder que les chiffres et +',
  '  // 2. Retirer le + ou le 00 du debut',
  '  // 3. Si deja avec indicatif (212 ou 34) -> OK',
  '  // 4. Si format local Maroc (0XXXXXXXX) -> ajouter 212',
  '  // 5. Si format local Espagne (6XX ou 7XX, 9 chiffres)',
  '  //    -> ajouter 34',
  '}',
]);
y += 2;

infoBox('La fonction toE164(phone, country) ajoute le "+" devant le numero normalise pour l\'affichage : toE164("0612345678", "MA") retourne "+212612345678".', colors.primary);

sectionTitle('Ou est-elle utilisee ?');
bullet('Envoi de SMS (send-code) : normalise avant envoi Infobip');
bullet('WhatsApp : normalise dans sendWhatsApp() et sendWhatsAppTemplate()');
bullet('Notifications : via lib/notify.ts qui passe le country');
bullet('Verification : comparaison des numeros normalises dans verify');

// ============================================================
// PAGE 8 - DEVISES
// ============================================================
addPage();
title('7. Devises et formatage');

paragraph('Le formatage des montants change selon le pays. Le Maroc utilise le Dirham (MAD) et l\'Espagne l\'Euro (EUR).');
y += 3;

sectionTitle('La fonction formatCurrency()');
codeBlock([
  '// lib/utils.ts',
  'function formatCurrency(amount, country) {',
  '  const { currency, locale } = COUNTRY_CONFIG[country];',
  '  return new Intl.NumberFormat(locale, {',
  '    style: "currency",',
  '    currency,          // "MAD" ou "EUR"',
  '  }).format(amount);',
  '}',
  '',
  '// Exemples :',
  'formatCurrency(1500, "MA"); // "1 500,00 MAD"',
  'formatCurrency(1500, "ES"); // "1.500,00 EUR" (separateur . en espagnol)',
]);
y += 2;

sectionTitle('Ou les devises sont utilisees');
comparisonTable(
  ['Emplacement', 'Maroc (MA)', 'Espagne (ES)'],
  [
    ['Dashboard graphiques', 'Revenus (MAD)', 'Revenus (EUR)'],
    ['PDF factures/devis', '1 500,00 MAD', '1.500,00 EUR'],
    ['DocumentView (apercu)', 'Total (MAD)', 'Total (EUR)'],
    ['Auto-messages {{amount}}', '1500 MAD', '1500 EUR'],
    ['Formulaire documents', 'Prix unitaire (MAD)', 'Prix unitaire (EUR)'],
  ]
);

infoBox('Avant les corrections, tous ces endroits affichaient "MAD" meme pour l\'Espagne. Maintenant la devise est dynamique selon le pays selectionne.', colors.success);

// ============================================================
// PAGE 9 - PDF
// ============================================================
addPage();
title('8. Documents PDF');

paragraph('Les factures, devis et bons de commande sont generes en PDF. Chaque pays a ses propres labels, mentions legales et informations entreprise.');
y += 3;

sectionTitle('Labels par pays (lib/pdfLabels.ts)');
comparisonTable(
  ['Element', 'Maroc (MA)', 'Espagne (ES)'],
  [
    ['Facture', 'FACTURE', 'FACTURA'],
    ['Devis', 'DEVIS', 'PRESUPUESTO'],
    ['Bon de commande', 'BON DE COMMANDE', 'PEDIDO'],
    ['Client', 'Client', 'Cliente'],
    ['Quantite', 'Quantite', 'Cantidad'],
    ['Prix unitaire', 'Prix Unitaire', 'Precio Unit.'],
    ['Total HT', 'Total HT', 'Total IVA excl.'],
    ['TVA', 'TVA (20%)', 'IVA (21%)'],
    ['Total TTC', 'Total TTC', 'Total IVA incl.'],
    ['Signature', 'Signature', 'Firma'],
    ['Siege social', 'SIEGE SOCIAL', 'DOMICILIO SOCIAL'],
    ['Mentions legales', 'Art 89 - CGI', 'Ley 37/1992 IVA'],
  ]
);

sectionTitle('Footer du PDF');
paragraph('Le pied de page affiche les informations legales de l\'entreprise selon le pays :');
codeBlock([
  '// Pour MA :',
  '// GROUPE OGINCE',
  '// SIEGE SOCIAL: Rue Essanaoubre... Casablanca',
  '// RC: 681785  Patente: 34214522',
  '',
  '// Pour ES :',
  '// GROUPE OGINCE ESPANA',
  '// DOMICILIO SOCIAL: Calle Ejemplo, 1 - Madrid',
  '// CIF: B00000000',
]);

sectionTitle('DocumentView (apercu HTML)');
paragraph('Le composant DocumentView.tsx affiche un apercu du document dans le navigateur avant generation PDF. Il accepte maintenant un prop "country" pour adapter tous les labels et devises.');

// ============================================================
// PAGE 10 - NOTIFICATIONS
// ============================================================
addPage();
title('9. Notifications');

paragraph('Le systeme envoie des notifications par 3 canaux : Push (FCM), WhatsApp et SMS. Chaque canal doit gerer le pays correctement.');
y += 3;

sectionTitle('WhatsApp (lib/whatsapp.ts)');
paragraph('Deux types de messages WhatsApp :');
bullet('Messages texte simples : fonctionnent dans la fenetre de 24h apres interaction du destinataire');
bullet('Messages template : fonctionnent a tout moment, mais doivent etre approuves par Meta/WhatsApp');
y += 2;

paragraph('Le pays impacte 3 choses dans WhatsApp :');
codeBlock([
  '// 1. Normalisation du telephone',
  'const normalized = normalizePhoneNumber(phone, country);',
  '',
  '// 2. Langue du template (fr ou es)',
  'language: country === "ES" ? "es" : "fr",',
  '',
  '// 3. Potentiellement un sender different par pays',
  '// (a configurer via INFOBIP_WHATSAPP_SENDER_ES)',
]);

sectionTitle('SMS');
paragraph('Les SMS sont envoyes via Infobip. La normalisation du numero est identique a WhatsApp. Le sender (nom affiche) peut etre different par pays.');

sectionTitle('Push Notifications (FCM)');
paragraph('Les notifications push Firebase sont envoyees via lib/fcm.ts. Elles ne sont pas impactees par le pays car le token FCM est lie a l\'appareil, pas au numero de telephone.');

sectionTitle('Le fichier lib/notify.ts');
paragraph('Ce fichier orchestre l\'envoi des notifications. Il envoie a la fois un push FCM et un WhatsApp :');
codeBlock([
  'async function notifyPlombier(',
  '  plombierId, title, body, data?,',
  '  whatsappTemplate?, country = "MA"',
  ') {',
  '  // 1. Envoyer le push FCM',
  '  await sendPushToPlombier(plombierId, title, body, data);',
  '',
  '  // 2. Recuperer le telephone du plombier',
  '  const phone = userDoc.data()?.phone;',
  '  // Utiliser le country du plombier (ou celui passe en param)',
  '  const plombierCountry = userDoc.data()?.country || country;',
  '',
  '  // 3. Envoyer WhatsApp avec le bon country',
  '  sendWhatsAppTemplate(phone, template, params, plombierCountry);',
  '}',
]);

// ============================================================
// PAGE 11 - DASHBOARD
// ============================================================
addPage();
title('10. Dashboard et filtrage');

paragraph('Le dashboard admin affiche des statistiques et graphiques. Toutes les donnees sont filtrees par le pays selectionne dans le CountryContext.');
y += 3;

sectionTitle('Comment le filtrage fonctionne');
codeBlock([
  '// dashboard/page.tsx',
  '',
  '// 1. Recuperer le filtre pays',
  'const { countryFilter, selectedCountry } = useCountry();',
  '',
  '// 2. Charger les clients du pays',
  'const clientsQuery = query(',
  '  collection(db, "clients"),',
  '  where("country", "in", countryFilter)',
  ');',
  '',
  '// 3. Filtrer les projets par clientIds',
  '// (les projets n\'ont pas de champ country direct,',
  '//  ils sont lies a un client qui a un pays)',
  'const projectsData = projectsDocs',
  '  .filter(d => clientIds.has(d.data().clientId));',
]);
y += 2;

sectionTitle('Devises dans les graphiques');
paragraph('Les labels des graphiques (Recharts) utilisent maintenant la devise dynamique :');
codeBlock([
  '// Avant (bug) :',
  'name="Revenus (MAD)"   // Toujours MAD meme pour ES !',
  '',
  '// Apres (corrige) :',
  'name={`Revenus (${currencyLabel})`}',
  '// Affiche "Revenus (MAD)" ou "Revenus (EUR)"',
  '// ou "Revenus (MAD/EUR)" si "ALL" est selectionne',
]);

sectionTitle('Schema de filtrage des donnees');
paragraph('Voici comment chaque collection est filtree :');
comparisonTable(
  ['Collection', 'Filtre par pays', 'Methode'],
  [
    ['clients', 'Oui, directement', 'where("country", "in", ...)'],
    ['projects', 'Indirect (via clientId)', 'Filter client-side'],
    ['documents', 'Indirect (via clientId)', 'Filter client-side'],
    ['manualRevenues', 'Indirect (via clientId)', 'Filter client-side'],
    ['users (plombiers)', 'Oui, directement', 'where("country", "in", ...)'],
    ['instantRequests', 'Oui, directement', 'where("country", "in", ...)'],
  ]
);

// ============================================================
// PAGE 12 - FIRESTORE
// ============================================================
addPage();
title('11. Base de donnees Firestore');

paragraph('Dans Firestore, chaque document possede un champ "country" pour identifier son pays. Voici comment c\'est structure :');
y += 3;

sectionTitle('Le champ "country" dans chaque collection');
codeBlock([
  '// Collection "clients"',
  '{',
  '  name: "Ahmed Ben...",',
  '  phone: "+212612345678",',
  '  country: "MA",        // <-- Le pays !',
  '  ...',
  '}',
  '',
  '// Collection "users" (plombiers)',
  '{',
  '  name: "Carlos...",',
  '  phone: "+34612345678",',
  '  country: "ES",        // <-- Le pays !',
  '  role: "plombier",',
  '  ...',
  '}',
]);
y += 2;

sectionTitle('Regles de securite Firestore');
paragraph('Les regles dans firestore.rules verifient l\'authentification et les roles. Chaque pays a ses propres donnees isolees grace au champ country.');
y += 2;

sectionTitle('Index Firestore');
paragraph('Le fichier firestore.indexes.json definit des index composites qui incluent le champ country pour des requetes performantes.');

infoBox('Le champ country est optionnel dans les types TypeScript (country?: Country). Les anciens documents sans ce champ sont traites comme "MA" par defaut. C\'est la retrocompatibilite.', colors.warning);

// ============================================================
// PAGE 13 - ESPACE CLIENT & PLOMBIER
// ============================================================
addPage();
title('12. Espace client & plombier');

sectionTitle('Espace client (/espace-client)');
paragraph('L\'espace client est accessible via leplombier.ma ou leplombier.es. Le pays est detecte automatiquement par le domaine.');
y += 2;
bullet('Login : SMS avec code a 6 chiffres (normalisation par pays)');
bullet('Dashboard : Commandes et documents du client');
bullet('Commander : Formulaire de demande avec services');
bullet('Documents : Factures et devis du client');
bullet('Codes promo : Codes promotionnels actives par l\'admin');
y += 3;

sectionTitle('Espace plombier (/espace-plombier)');
paragraph('L\'espace plombier utilise une authentification email/mot de passe via Firebase Auth.');
y += 2;
bullet('Login : Email + mot de passe');
bullet('Dashboard : Statistiques et projets en cours');
bullet('Instant : Demandes de service instantanees (style inDrive)');
bullet('Revenus : Suivi des revenus par projet');
bullet('Demandes de pieces : Commande de materiaux');
y += 3;

sectionTitle('Detection du pays pour les espaces');
codeBlock([
  '// Le pays est detecte par :',
  '',
  '// 1. Le domaine (automatique)',
  'const host = request.headers.get("host");',
  'if (host?.includes("leplombier.es")) country = "ES";',
  '',
  '// 2. Le body de la requete (prioritaire)',
  'const { country: bodyCountry } = await request.json();',
  'if (bodyCountry === "ES") country = "ES";',
  '',
  '// 3. Par defaut : "MA"',
]);

sectionTitle('Demandes instantanees (inDrive)');
paragraph('Les demandes instantanees sont filtrees par pays ET par ville. Un plombier a Casablanca ne verra pas les demandes de Madrid, et inversement.');

// ============================================================
// PAGE 14 - MOBILE
// ============================================================
addPage();
title('13. Applications mobiles');

paragraph('Le projet contient deux applications mobiles construites avec Capacitor (un framework qui transforme une app web en app native) :');
y += 3;

comparisonTable(
  ['', 'App Client', 'App Plombier'],
  [
    ['Dossier', 'mobile-client/', 'mobile-plombier/'],
    ['Plateforme', 'iOS + Android', 'iOS + Android'],
    ['Auth', 'SMS (code)', 'Email/password'],
    ['Fonction', 'Commander, voir docs', 'Voir projets, instant'],
    ['GPS', 'Non', 'Oui (suivi position)'],
    ['Push', 'Oui (FCM)', 'Oui (FCM)'],
  ]
);

paragraph('Les apps mobiles heritent du pays du client/plombier stocke dans Firestore. La detection par domaine ne s\'applique pas aux apps natives — le pays est passe explicitement dans les requetes API.');

// ============================================================
// PAGE 15 - CORRECTIONS
// ============================================================
addPage();
title('14. Corrections effectuees');
y += 3;

paragraph('Voici la liste des corrections apportees pour que MA et ES fonctionnent correctement :');
y += 2;

statusItem('CORRIGE', colors.success, 'companyConfig.ts : Les infos entreprise ES ont maintenant une adresse, telephone et CIF espagnols (avant : copie du Maroc)');
statusItem('CORRIGE', colors.success, 'pdfGenerator.ts : Le footer PDF affiche CIF pour ES au lieu de RC/Patente. Labels client traduits (Tel, Email).');
statusItem('CORRIGE', colors.success, 'phone.ts : toE164() accepte maintenant un parametre country (avant : toujours MA).');
statusItem('CORRIGE', colors.success, 'whatsapp.ts : sendWhatsApp() et sendWhatsAppTemplate() acceptent country. Langue template : "es" pour ES.');
statusItem('CORRIGE', colors.success, 'notify.ts : notifyPlombier() et notifyClient() passent le country pour la normalisation du telephone.');
statusItem('CORRIGE', colors.success, 'send-code, verify, check-code-sent : Le fallback backward-compatibility fonctionne pour MA ET ES.');
statusItem('CORRIGE', colors.success, 'auto-messages/send : {{amount}} affiche EUR pour ES, MAD pour MA. Fix error: any -> instanceof Error.');
statusItem('CORRIGE', colors.success, 'dashboard : Labels graphiques dynamiques (Revenus (MAD) -> Revenus (EUR) selon le pays).');
statusItem('CORRIGE', colors.success, 'DocumentView.tsx : Devise dynamique, titres traduits (FACTURA...), footer CIF, TVA->IVA, mentions legales ES.');
statusItem('CORRIGE', colors.success, 'documents/page.tsx : Label "Prix unitaire" avec devise dynamique.');
statusItem('CORRIGE', colors.success, 'services.ts : Suppression des priceLabel "DH" hardcodes. Nouvelle fonction formatServicePrice(service, currency).');
statusItem('CORRIGE', colors.success, 'DescriptionWithSuggestions.tsx : Affichage des prix avec devise du pays selectionne.');

// ============================================================
// PAGE 16 - AMELIORATIONS
// ============================================================
addPage();
title('15. Points d\'amelioration restants');
y += 3;

sectionTitle('Moyenne priorite');
statusItem('A FAIRE', colors.warning, 'Ajouter un sender SMS specifique pour ES (env var INFOBIP_SENDER_ES) pour que les SMS espagnols n\'arrivent pas de "GROUPE OGINCE".');
statusItem('A FAIRE', colors.warning, 'Ajouter INFOBIP_WHATSAPP_SENDER_ES pour un numero WhatsApp Business espagnol dedie.');
statusItem('A FAIRE', colors.warning, 'Rendre le champ country obligatoire dans les types User et Client (retirer le ?) pour eviter les fallbacks silencieux.');
statusItem('A FAIRE', colors.warning, 'Ajouter un filtre country directement dans les requetes Firestore pour projects et manualRevenues (au lieu de filtrer cote client par clientIds).');
statusItem('A FAIRE', colors.warning, 'Creer des templates WhatsApp en espagnol ("demande_service_recue_es", "offre_acceptee_es") et les faire approuver par Meta.');
statusItem('A FAIRE', colors.warning, 'Les pages clients/[id], projets, commandes ont encore des labels "DH" ou "MAD" hardcodes dans les formulaires.');
y += 3;

sectionTitle('Basse priorite');
statusItem('OPTIONNEL', colors.gray, 'Ajouter NEXT_PUBLIC_ACTIVE_COUNTRY=ES dans .env pour le deploiement espagnol.');
statusItem('OPTIONNEL', colors.gray, 'Login plombier : ajouter un selecteur de pays (utile si le meme domaine sert les deux pays).');
statusItem('OPTIONNEL', colors.gray, 'Zones de recrutement : le type Recruitment a un champ "zones" limite aux villes marocaines. Ajouter des villes espagnoles.');
statusItem('OPTIONNEL', colors.gray, 'Services : traduire les labels en espagnol ("Recherche de fuite" -> "Busqueda de fugas").');
statusItem('OPTIONNEL', colors.gray, 'Ajouter un 3eme pays (FR par exemple) : suivre la checklist du chapitre suivant.');

// ============================================================
// PAGE 17 - CHECKLIST NOUVEAU PAYS
// ============================================================
addPage();
title('16. Checklist : ajouter un pays');

paragraph('Si vous voulez ajouter un nouveau pays (par exemple la France "FR"), voici toutes les etapes a suivre dans l\'ordre :');
y += 3;

sectionTitle('Etape 1 : Types (types/index.ts)');
codeBlock([
  '// Avant :',
  'export type Country = "MA" | "ES";',
  '',
  '// Apres :',
  'export type Country = "MA" | "ES" | "FR";',
]);

sectionTitle('Etape 2 : Configuration (lib/companyConfig.ts)');
bullet('Ajouter FR dans COUNTRY_CONFIG (currency: "EUR", locale: "fr-FR")');
bullet('Ajouter FR dans SITE_CONFIG (websiteUrl, domain)');
bullet('Ajouter FR dans companyInfoByCountry (nom, adresse, SIRET, etc.)');

sectionTitle('Etape 3 : Labels PDF (lib/pdfLabels.ts)');
bullet('Ajouter les labels FR dans la constante LABELS');

sectionTitle('Etape 4 : Telephone (lib/phone.ts)');
bullet('Ajouter la normalisation pour les numeros francais (+33, format 06/07)');
bullet('Ajouter "FR" dans le type PhoneCountry');

sectionTitle('Etape 5 : Traductions (messages/)');
bullet('Creer messages/fr-FR.json (ou reutiliser fr.json)');

sectionTitle('Etape 6 : Country Context');
bullet('Le CountryContext supporte deja "ALL" — rien a changer si vous gardez le filtre existant');
bullet('Adapter le selecteur dans Layout.tsx pour afficher le 3eme drapeau');

sectionTitle('Etape 7 : Firestore');
bullet('Mettre a jour les regles Firestore si necessaire');
bullet('Ajouter des index pour les requetes avec country="FR"');

sectionTitle('Etape 8 : Variables d\'environnement');
bullet('Ajouter INFOBIP_SENDER_FR si un sender SMS different est necessaire');
bullet('Configurer le domaine (ex: leplombier.fr)');

sectionTitle('Etape 9 : Tests');
bullet('Tester l\'envoi SMS vers un numero francais');
bullet('Tester la generation PDF avec les labels FR');
bullet('Tester le filtrage par pays dans le dashboard');

// ============================================================
// LAST PAGE - CONCLUSION
// ============================================================
addPage();
title('Resume & Conclusion');
y += 5;

doc.setFillColor(...colors.bg);
doc.roundedRect(margin, y, contentWidth, 45, 3, 3, 'F');
doc.setDrawColor(...colors.primary);
doc.setLineWidth(0.5);
doc.roundedRect(margin, y, contentWidth, 45, 3, 3, 'S');
y += 8;

doc.setFontSize(10);
doc.setFont('helvetica', 'normal');
doc.setTextColor(...colors.dark);
const conclusion = doc.splitTextToSize(
  'Le systeme multi-pays du CRM Plomberie est maintenant fonctionnel pour MA et ES. Les corrections apportees couvrent les 4 problemes critiques (infos entreprise, PDF, telephone, notifications) et les 8 problemes de haute priorite (devises, labels, fallback, dashboard). Le code est structure de maniere a faciliter l\'ajout de nouveaux pays en suivant la checklist du chapitre 16.',
  contentWidth - 10
);
conclusion.forEach(line => {
  doc.text(line, margin + 5, y);
  y += 5;
});
y += 10;

sectionTitle('Les 5 choses a retenir');
bullet('1. Chaque donnee a un champ "country" (MA ou ES) pour l\'isolation');
bullet('2. Le CountryContext gere la selection du pays dans l\'interface admin');
bullet('3. Les numeros de telephone sont normalises differemment par pays');
bullet('4. Les devises, labels PDF et mentions legales sont specifiques au pays');
bullet('5. Les notifications (WhatsApp/SMS) utilisent la langue et le sender du pays');

y += 8;
separator();
doc.setFontSize(8);
doc.setTextColor(...colors.gray);
doc.text('Rapport genere par Claude Code (Opus 4.6) - 8 Mars 2026', pageWidth / 2, y, { align: 'center' });
y += 5;
doc.text('CRM Plomberie - Guide Multi-Pays MA/ES', pageWidth / 2, y, { align: 'center' });

// Add page numbers
const totalPages = doc.internal.getNumberOfPages();
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  doc.setFontSize(8);
  doc.setTextColor(...colors.gray);
  doc.text(`Page ${i} / ${totalPages}`, pageWidth / 2, 293, { align: 'center' });
}

// Save
const output = doc.output('arraybuffer');
fs.writeFileSync('/Users/abderrahimmolatef/app/Guide_Multi_Pays_MA_ES.pdf', Buffer.from(output));
console.log('PDF generated successfully!');
