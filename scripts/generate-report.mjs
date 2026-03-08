import { jsPDF } from 'jspdf';
import fs from 'fs';

const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
const pageWidth = 210;
const margin = 20;
const contentWidth = pageWidth - 2 * margin;
let y = 0;
let pageNum = 1;

const colors = {
  primary: [37, 99, 235],    // blue
  danger: [220, 38, 38],     // red
  warning: [234, 179, 8],    // yellow
  success: [22, 163, 74],    // green
  dark: [30, 30, 30],
  gray: [100, 100, 100],
  lightGray: [200, 200, 200],
  bg: [245, 247, 250],
};

function addPage() {
  doc.addPage();
  pageNum++;
  y = 20;
  // footer on previous page
  doc.setFontSize(8);
  doc.setTextColor(...colors.gray);
  doc.text(`Page ${pageNum}`, pageWidth / 2, 290, { align: 'center' });
}

function checkSpace(needed) {
  if (y + needed > 275) {
    addPage();
  }
}

function title(text, size = 22) {
  checkSpace(20);
  doc.setFontSize(size);
  doc.setTextColor(...colors.primary);
  doc.setFont('helvetica', 'bold');
  doc.text(text, margin, y);
  y += size * 0.5 + 2;
}

function subtitle(text, size = 14) {
  checkSpace(15);
  y += 4;
  doc.setFontSize(size);
  doc.setTextColor(...colors.dark);
  doc.setFont('helvetica', 'bold');
  doc.text(text, margin, y);
  y += size * 0.45 + 2;
  // underline
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

function badge(text, color, xPos) {
  doc.setFillColor(...color);
  const w = doc.getTextWidth(text) + 6;
  doc.roundedRect(xPos, y - 3.5, w, 5, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(text, xPos + 3, y);
}

function severityItem(level, text) {
  checkSpace(8);
  const colorMap = {
    'CRITIQUE': colors.danger,
    'HAUTE': [234, 88, 12],
    'MOYENNE': colors.warning,
    'BASSE': colors.success,
  };
  const col = colorMap[level] || colors.gray;
  badge(level, col, margin);
  doc.setTextColor(...colors.dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const badgeW = doc.getTextWidth(level) + 10;
  const lines = doc.splitTextToSize(text, contentWidth - badgeW - 2);
  for (let i = 0; i < lines.length; i++) {
    doc.text(lines[i], margin + badgeW, y);
    y += 4.5;
  }
  y += 1;
}

function scoreBar(label, score, max = 10) {
  checkSpace(12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.dark);
  doc.text(label, margin, y);

  const barX = margin + 55;
  const barW = 80;
  const barH = 5;

  // background
  doc.setFillColor(...colors.lightGray);
  doc.roundedRect(barX, y - 3.5, barW, barH, 2, 2, 'F');

  // fill
  const pct = score / max;
  let barColor = colors.success;
  if (pct < 0.4) barColor = colors.danger;
  else if (pct < 0.7) barColor = colors.warning;

  doc.setFillColor(...barColor);
  if (pct > 0) doc.roundedRect(barX, y - 3.5, barW * pct, barH, 2, 2, 'F');

  doc.setTextColor(...colors.dark);
  doc.text(`${score}/${max}`, barX + barW + 3, y);
  y += 8;
}

function separator() {
  y += 3;
  doc.setDrawColor(...colors.lightGray);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;
}

// ============================================================
// PAGE 1 - COVER
// ============================================================
y = 60;
doc.setFillColor(...colors.primary);
doc.rect(0, 0, pageWidth, 45, 'F');
doc.setTextColor(255, 255, 255);
doc.setFontSize(28);
doc.setFont('helvetica', 'bold');
doc.text('RAPPORT D\'AUDIT', pageWidth / 2, 22, { align: 'center' });
doc.setFontSize(16);
doc.text('CRM Plomberie - Analyse Complete', pageWidth / 2, 33, { align: 'center' });

y = 65;
doc.setTextColor(...colors.dark);
doc.setFontSize(12);
doc.setFont('helvetica', 'normal');
doc.text('Date : 8 Mars 2026', margin, y); y += 7;
doc.text('Projet : crm-plomberie v1.0.0', margin, y); y += 7;
doc.text('Stack : Next.js 14 + Firebase + TypeScript + Tailwind CSS', margin, y); y += 7;
doc.text('Auteur : Claude Code (Opus 4.6)', margin, y); y += 15;

// Score global
doc.setFillColor(...colors.bg);
doc.roundedRect(margin, y, contentWidth, 50, 3, 3, 'F');
doc.setDrawColor(...colors.primary);
doc.setLineWidth(0.5);
doc.roundedRect(margin, y, contentWidth, 50, 3, 3, 'S');
y += 10;
doc.setFontSize(14);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...colors.primary);
doc.text('SCORE GLOBAL :  6.2 / 10', pageWidth / 2, y, { align: 'center' });
y += 10;
doc.setFontSize(9);
doc.setFont('helvetica', 'normal');
doc.setTextColor(...colors.gray);
doc.text('Bonne base architecturale mais des problemes de securite critiques a corriger', pageWidth / 2, y, { align: 'center' });
y += 15;

// Summary boxes
const boxW = (contentWidth - 6) / 3;
const boxes = [
  { label: 'Points forts', count: '7', color: colors.success },
  { label: 'Problemes', count: '15', color: colors.warning },
  { label: 'Critiques', count: '5', color: colors.danger },
];
boxes.forEach((box, i) => {
  const bx = margin + i * (boxW + 3);
  doc.setFillColor(...box.color);
  doc.roundedRect(bx, y, boxW, 20, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(box.count, bx + boxW / 2, y + 10, { align: 'center' });
  doc.setFontSize(8);
  doc.text(box.label, bx + boxW / 2, y + 16, { align: 'center' });
});
y += 30;

// Table of contents
subtitle('Table des matieres');
const toc = [
  '1. Vue d\'ensemble du projet',
  '2. Scores par categorie',
  '3. Architecture & Structure',
  '4. Qualite du code TypeScript',
  '5. Securite (Firebase, API, Secrets)',
  '6. API Routes & Backend',
  '7. Gestion d\'etat & Hooks',
  '8. Performance & Bundle',
  '9. Tests & Qualite',
  '10. Problemes trouves (par severite)',
  '11. Recommandations prioritaires',
  '12. Plan d\'action pour debutant',
];
toc.forEach(item => {
  bullet(item, '-', 2);
});

// ============================================================
// PAGE 2 - SCORES
// ============================================================
addPage();
title('1. Vue d\'ensemble du projet');
paragraph('CRM Plomberie est une application web complete de gestion pour entreprises de plomberie. Elle permet de gerer les clients, les projets, les plombiers, la facturation, le planning et les communications automatisees (SMS, WhatsApp, Email).');
paragraph('Le projet supporte deux pays (Maroc et Espagne) avec internationalisation, devises differentes et configurations specifiques par pays.');
y += 3;

sectionTitle('Technologies utilisees');
bullet('Frontend : Next.js 14 (App Router) + React 18 + TypeScript');
bullet('Style : Tailwind CSS 3.4 avec theme personnalise');
bullet('Base de donnees : Firebase Firestore (NoSQL temps reel)');
bullet('Authentification : Firebase Auth + JWT custom');
bullet('Stockage : Firebase Storage');
bullet('API : Next.js API Routes (serverless)');
bullet('Mobile : Capacitor (iOS + Android) pour 2 apps');
bullet('Notifications : Infobip (SMS), Twilio (SMS), Nodemailer (Email)');
bullet('PDF : jsPDF + html2canvas');
bullet('Graphiques : Recharts');
bullet('Deploiement : Vercel');
y += 3;

sectionTitle('Modules principaux');
bullet('Dashboard - Tableaux de bord avec graphiques et statistiques');
bullet('Clients - Gestion complete (CRUD, historique, espace client)');
bullet('Projets - Suivi des interventions et devis');
bullet('Commandes - Gestion des commandes');
bullet('Plombiers - Gestion des equipes et espace plombier');
bullet('Planning - Planification des interventions');
bullet('Documents - Generation de factures et devis PDF');
bullet('Fournisseurs & Partenaires - Gestion des fournisseurs');
bullet('Recrutements - Module de recrutement');
bullet('Messages automatiques - Notifications multi-canal');
bullet('Apps mobiles - App client + App plombier (Capacitor)');

// ============================================================
// PAGE 3 - SCORES
// ============================================================
addPage();
title('2. Scores par categorie');
y += 5;

scoreBar('Architecture', 7);
scoreBar('TypeScript & Types', 8);
scoreBar('Securite', 4);
scoreBar('Firebase Rules', 6);
scoreBar('API Routes', 6);
scoreBar('Gestion d\'etat', 7);
scoreBar('Performance', 5);
scoreBar('Tests', 1);
scoreBar('Documentation', 5);
scoreBar('Mobile', 6);
scoreBar('i18n', 7);
scoreBar('Code duplique', 6);

separator();

paragraph('Explication des scores pour un debutant :');
y += 2;
bullet('Architecture (7/10) : Le projet est bien organise avec une separation claire entre admin, client et plombier. Les dossiers sont logiques.');
bullet('TypeScript (8/10) : Tres bon usage du typage. Le mode strict est active et les types sont bien definis. Seulement 2 utilisations de "any".');
bullet('Securite (4/10) : PROBLEME MAJEUR - des secrets (mots de passe, cles API) sont exposes dans le code. Le JWT_SECRET est "change-me". C\'est la priorite #1.');
bullet('Tests (1/10) : Aucun test trouve dans le projet. C\'est risque pour un projet en production.');

// ============================================================
// PAGE 4 - ARCHITECTURE
// ============================================================
addPage();
title('3. Architecture & Structure');

sectionTitle('Organisation des dossiers');
paragraph('Le projet suit la convention Next.js 14 App Router. Voici la structure :');
y += 2;

const structure = [
  '/app                    -> Pages et routes API (Next.js App Router)',
  '  /dashboard            -> Tableau de bord admin',
  '  /clients              -> Gestion des clients',
  '  /projets              -> Gestion des projets',
  '  /commandes            -> Gestion des commandes',
  '  /planning             -> Planning des interventions',
  '  /documents            -> Generation de documents PDF',
  '  /plombiers            -> Gestion des plombiers',
  '  /fournisseurs         -> Gestion des fournisseurs',
  '  /espace-client        -> Espace client (login, commandes, docs)',
  '  /espace-plombier      -> Espace plombier (projets, revenus)',
  '  /api                  -> Routes API serverless',
  '/components             -> 17 composants React partages',
  '/lib                    -> 24 fichiers utilitaires (Firebase, etc.)',
  '/hooks                  -> 5 hooks React personnalises',
  '/contexts               -> 1 contexte (CountryContext)',
  '/types                  -> Definitions TypeScript (327 lignes)',
  '/messages               -> Traductions i18n (fr.json, es.json)',
  '/mobile-client          -> App mobile client (Capacitor)',
  '/mobile-plombier        -> App mobile plombier (Capacitor)',
  '/scripts                -> Scripts utilitaires',
];
structure.forEach(s => {
  doc.setFontSize(8);
  doc.setFont('courier', 'normal');
  doc.setTextColor(...colors.dark);
  checkSpace(4);
  doc.text(s, margin + 4, y);
  y += 4;
});
y += 3;

sectionTitle('Points positifs');
bullet('Separation claire entre les 3 espaces : admin, client, plombier');
bullet('Routes API bien organisees par fonctionnalite');
bullet('Composants partages dans /components (reutilisation du code)');
bullet('Hooks personnalises pour la logique metier (auth, localisation)');

sectionTitle('Points a ameliorer');
bullet('Les composants pourraient etre organises par feature (ex: /components/client/, /components/plombier/)');
bullet('Pas de dossier utils/ pour les fonctions pures');
bullet('Certaines pages sont tres longues (500+ lignes) et devraient etre decoupees en sous-composants');

// ============================================================
// PAGE 5 - TYPESCRIPT
// ============================================================
addPage();
title('4. Qualite du code TypeScript');

sectionTitle('Configuration TypeScript');
paragraph('Le fichier tsconfig.json est bien configure avec le mode strict active. Cela signifie que TypeScript va verifier plus rigoureusement votre code et detecter plus d\'erreurs.');
y += 2;

sectionTitle('Systeme de types (types/index.ts)');
paragraph('Le fichier de types est complet avec 327 lignes definissant toutes les interfaces du projet :');
bullet('User, Client, Project, Commande - Interfaces principales bien definies');
bullet('ProjectStatus, InstantRequestStatus - Types union pour les statuts');
bullet('Country = "MA" | "ES" - Type pour le multi-pays');
bullet('Bonne utilisation des champs optionnels avec "?:"');
y += 2;

sectionTitle('Ce qui est bien fait');
bullet('Mode strict active -> detecte les erreurs au compile time');
bullet('Seulement 2 utilisations de "any" dans tout le projet (excellent !)');
bullet('Interfaces bien definies pour chaque entite metier');
bullet('Path alias @/* configure pour des imports propres');
y += 2;

sectionTitle('Ce qu\'il faut ameliorer');
bullet('Les 2 "as any" restants dans messages-automatiques/page.tsx peuvent etre corriges facilement avec le bon type d\'evenement');
bullet('Certaines fonctions API retournent des objets sans type de retour explicite');
bullet('Ajouter des types pour les reponses API (ex: ApiResponse<T>)');

sectionTitle('Conseil pour debutant');
paragraph('TypeScript est comme un filet de securite. Le mode "strict" est votre meilleur ami : il vous oblige a etre precis sur les types de donnees. Si vous voyez une erreur TypeScript, ne la contournez jamais avec "as any" - cherchez plutot le bon type a utiliser.');

// ============================================================
// PAGE 6 - SECURITE
// ============================================================
addPage();
title('5. Securite');
doc.setFillColor(255, 240, 240);
doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
doc.setTextColor(...colors.danger);
doc.setFontSize(10);
doc.setFont('helvetica', 'bold');
doc.text('ATTENTION : Des problemes de securite critiques ont ete trouves !', margin + 4, y + 7);
y += 18;

sectionTitle('5.1 Secrets exposes (.env.local)');
paragraph('Le fichier .env.local contient des informations sensibles (mots de passe, cles API) et il semble etre accessible dans le depot. C\'est le probleme le plus grave du projet.');
y += 2;
bullet('FIREBASE_SERVICE_ACCOUNT_KEY : Cle privee Firebase exposee -> Acces total a la base de donnees');
bullet('TWILIO_ACCOUNT_SID + AUTH_TOKEN : Credentials Twilio -> Quelqu\'un pourrait envoyer des SMS a vos frais');
bullet('INFOBIP_API_KEY : Cle API Infobip -> Meme risque que Twilio');
bullet('SMTP_PASS : Mot de passe email -> Acces a la boite mail');
bullet('JWT_SECRET = "change-me..." : Secret JWT par defaut -> Les tokens d\'authentification peuvent etre falsifies');
y += 3;

sectionTitle('5.2 Regles Firestore');
paragraph('Les regles de securite Firestore sont globalement bonnes avec des verifications d\'authentification et de roles. Cependant :');
bullet('La collection "recruitments" autorise la creation SANS authentification (allow create: if true). Un attaquant pourrait spammer votre base de donnees.');
bullet('Les regles de lecture sont bien protegees par role (admin, plombier, client)');
bullet('Les regles de stockage (Storage) verifient bien que chaque plombier ecrit dans son propre dossier');
y += 3;

sectionTitle('5.3 API Routes');
bullet('Pas de rate limiting : un attaquant pourrait envoyer des milliers de requetes SMS');
bullet('Pas de validation d\'entree systematique (Zod est installe mais sous-utilise)');
bullet('Du code de debug laisse en production (ecriture dans .cursor/debug.log)');
y += 3;

sectionTitle('Conseil pour debutant');
paragraph('La securite n\'est pas optionnelle ! Meme pour un petit projet, il faut : 1) Ne JAMAIS committer de secrets dans git. 2) Utiliser des variables d\'environnement sur Vercel. 3) Changer tous les mots de passe si ils ont ete exposes. 4) Ajouter .env.local dans .gitignore.');

// ============================================================
// PAGE 7 - API
// ============================================================
addPage();
title('6. API Routes & Backend');

sectionTitle('Vue d\'ensemble');
paragraph('Le projet contient environ 40 routes API serverless dans /app/api/. Elles gerent l\'authentification, les notifications, les webhooks et les operations CRUD.');
y += 2;

sectionTitle('Routes principales analysees');

bullet('/api/espace-client/send-code : Envoi de code SMS pour connexion client');
paragraph('  Bien : normalisation du numero, hashage SHA-256 du code, gestion multi-pays.', 4);
paragraph('  A ameliorer : pas de rate limiting, cree un client automatiquement si inexistant.', 4);
y += 2;

bullet('/api/espace-client/verify : Verification du code SMS');
paragraph('  Bien : comparaison de hash securisee, generation JWT, verification par pays.', 4);
y += 2;

bullet('/api/auto-messages/send : Envoi de messages automatiques en masse');
paragraph('  Bien : systeme de variables ({{clientName}}), piste d\'audit.', 4);
paragraph('  A ameliorer : probleme N+1 (requete par client au lieu de batch), pas de rate limiting.', 4);
y += 2;

bullet('/api/espace-plombier/instant-offer : Offres instantanees');
paragraph('  Bien : verification du token Firebase Admin, filtrage par pays.', 4);
paragraph('  A ameliorer : logs de debug ecrits dans le systeme de fichiers (anti-pattern en production).', 4);
y += 3;

sectionTitle('Probleme N+1 (explique pour debutant)');
paragraph('Le probleme N+1 est quand votre code fait 1 requete pour chercher une liste, puis 1 requete supplementaire pour CHAQUE element. Exemple : si vous avez 100 clients, au lieu de faire 1 requete groupee, le code fait 101 requetes (1 + 100). C\'est tres lent et couteux avec Firestore (qui facture par lecture).');

sectionTitle('Recommandations');
bullet('Ajouter un middleware de rate limiting (ex: 5 SMS/min par IP)');
bullet('Utiliser Zod pour valider toutes les entrees API');
bullet('Supprimer le code de debug avant mise en production');
bullet('Batched reads pour eviter le probleme N+1');

// ============================================================
// PAGE 8 - STATE & HOOKS
// ============================================================
addPage();
title('7. Gestion d\'etat & Hooks');

sectionTitle('Contextes React');
paragraph('Le projet utilise un seul contexte React : CountryContext. C\'est un bon choix car Firebase Firestore sert de source de verite pour toutes les donnees.');
y += 2;

bullet('CountryContext : Gere le pays selectionne (MA/ES). Persiste dans localStorage. Gere correctement le rendu cote serveur (SSR).');
y += 3;

sectionTitle('Hooks personnalises');
y += 2;

bullet('useAuth (59 lignes) : Authentification Firebase pour l\'admin. Ecoute les changements d\'etat auth et charge le document utilisateur depuis Firestore.');
bullet('useClientAuth (74 lignes) : Authentification par SMS/JWT pour les clients. Gere le token dans localStorage.');
bullet('usePlombierAuth (79 lignes) : Authentification email/mot de passe pour les plombiers.');
bullet('useRegisterFcmToken (56 lignes) : Enregistrement du token FCM pour les notifications push.');
bullet('usePlombierLocation (85 lignes) : Suivi GPS en temps reel du plombier, mise a jour dans Firestore.');
y += 3;

sectionTitle('Points positifs');
bullet('Bonne utilisation des listeners Firestore temps reel (onSnapshot)');
bullet('Nettoyage correct des subscriptions dans useEffect (return unsubscribe)');
bullet('Approche minimaliste : pas de Redux ou Zustand, Firebase est la source de verite');
y += 2;

sectionTitle('Points a ameliorer');
bullet('Pas de gestion d\'erreur globale (toast notifications)');
bullet('useAuth ne gere pas l\'echec de chargement du document utilisateur');
bullet('Pas de mecanisme de retry pour les connexions perdues');

sectionTitle('Conseil pour debutant');
paragraph('Un "hook" React est une fonction reutilisable qui encapsule de la logique. Par exemple, useAuth() gere toute la complexite de l\'authentification et vous donne simplement { user, loading }. C\'est un pattern tres puissant pour eviter de dupliquer du code.');

// ============================================================
// PAGE 9 - PERFORMANCE
// ============================================================
addPage();
title('8. Performance & Bundle');

sectionTitle('Dependances lourdes');
paragraph('Certaines librairies sont volumineuses et impactent le temps de chargement initial :');
y += 2;
bullet('recharts (~500 Ko) : Librairie de graphiques. Utilisee pour le dashboard.');
bullet('jspdf (~300 Ko) : Generation de PDF cote client.');
bullet('html2canvas (~200 Ko) : Capture d\'ecran HTML pour les PDF.');
bullet('firebase (~400 Ko) : SDK Firebase complet.');
y += 3;

sectionTitle('Optimisations manquantes');
bullet('Pas d\'imports dynamiques (dynamic imports) : Les librairies lourdes comme jsPDF et Recharts sont chargees meme si l\'utilisateur n\'en a pas besoin.');
bullet('Pas de lazy loading pour les pages : Toutes les pages sont chargees au demarrage.');
bullet('Pas d\'analyse du bundle : Aucun outil configure pour mesurer la taille du bundle (ex: @next/bundle-analyzer).');
bullet('Images : Pas d\'optimisation d\'images visible (Next.js Image component sous-utilise).');
y += 3;

sectionTitle('Conseil pour debutant');
paragraph('L\'import dynamique permet de ne charger une librairie que quand l\'utilisateur en a besoin. Par exemple, jsPDF ne devrait etre charge que quand l\'utilisateur clique sur "Generer PDF", pas au chargement de la page. Voici comment :');
y += 2;
doc.setFont('courier', 'normal');
doc.setFontSize(8);
doc.setTextColor(...colors.gray);
const code = [
  "// Mauvais (charge au demarrage) :",
  "import { jsPDF } from 'jspdf';",
  "",
  "// Bon (charge a la demande) :",
  "const generatePDF = async () => {",
  "  const { jsPDF } = await import('jspdf');",
  "  const doc = new jsPDF();",
  "  // ...",
  "};",
];
code.forEach(line => {
  checkSpace(4);
  doc.text(line, margin + 8, y);
  y += 3.5;
});
doc.setFont('helvetica', 'normal');

// ============================================================
// PAGE 10 - TESTS
// ============================================================
addPage();
title('9. Tests & Qualite');

doc.setFillColor(255, 240, 240);
doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
doc.setTextColor(...colors.danger);
doc.setFontSize(10);
doc.setFont('helvetica', 'bold');
doc.text('AUCUN TEST TROUVE DANS LE PROJET', margin + 4, y + 7);
y += 18;

paragraph('L\'absence de tests est un risque majeur pour un projet en production. Chaque modification de code peut casser des fonctionnalites existantes sans que personne ne s\'en rende compte.');
y += 3;

sectionTitle('Ce qu\'il faudrait tester en priorite');
bullet('Authentification client (envoi de code, verification)');
bullet('Authentification plombier (login, session)');
bullet('Normalisation des numeros de telephone');
bullet('Envoi de messages automatiques');
bullet('Generation de PDF');
bullet('Calculs de revenus et statistiques');
bullet('Regles Firestore (avec l\'emulateur Firebase)');
y += 3;

sectionTitle('Outils recommandes');
bullet('Vitest ou Jest : Framework de tests unitaires');
bullet('React Testing Library : Tests de composants React');
bullet('Firebase Emulator : Tests des regles Firestore sans toucher a la production');
bullet('Playwright ou Cypress : Tests end-to-end (simulation d\'un vrai utilisateur)');
y += 3;

sectionTitle('Autres outils de qualite manquants');
bullet('ESLint : Configure mais pas applique systematiquement');
bullet('Prettier : Pas de formatage automatique configure');
bullet('Husky : Pas de pre-commit hooks pour verifier le code avant commit');
bullet('lint-staged : Pas de linting automatique sur les fichiers modifies');
y += 3;

sectionTitle('Conseil pour debutant');
paragraph('Un test, c\'est du code qui verifie que votre code fonctionne correctement. Exemple simple : vous avez une fonction qui normalise un numero de telephone. Un test verifierait que normalizePhone("06 12 34 56 78") retourne "+33612345678". Si quelqu\'un modifie la fonction par erreur, le test echouera et preViendra le probleme AVANT la mise en production.');

// ============================================================
// PAGE 11 - PROBLEMES
// ============================================================
addPage();
title('10. Problemes trouves');
y += 3;

sectionTitle('Severite CRITIQUE (a corriger immediatement)');
severityItem('CRITIQUE', 'Secrets exposes dans .env.local : cles API, mots de passe, cle privee Firebase. Risque : acces non autorise a tous vos services.');
severityItem('CRITIQUE', 'JWT_SECRET = "change-me" : Les tokens d\'authentification des clients peuvent etre falsifies. N\'importe qui peut se connecter comme n\'importe quel client.');
severityItem('CRITIQUE', 'Pas de .gitignore pour .env.local : Les secrets sont potentiellement dans l\'historique Git.');
severityItem('CRITIQUE', 'Code de debug en production : Ecriture de logs dans .cursor/debug.log dans les routes API.');
severityItem('CRITIQUE', 'Collection "recruitments" ouverte en ecriture sans authentification dans les regles Firestore.');

y += 3;
sectionTitle('Severite HAUTE');
severityItem('HAUTE', 'Pas de rate limiting sur les endpoints SMS : Un attaquant peut envoyer des milliers de SMS a vos frais.');
severityItem('HAUTE', 'Probleme N+1 dans l\'envoi de messages automatiques : Performance catastrophique avec beaucoup de clients.');
severityItem('HAUTE', 'Aucun test automatise : Impossible de verifier que le code fonctionne apres une modification.');
severityItem('HAUTE', 'Pas de validation d\'entree systematique : Les API acceptent des donnees sans verification.');

y += 3;
sectionTitle('Severite MOYENNE');
severityItem('MOYENNE', 'Pas de gestion d\'erreur globale : L\'utilisateur ne voit pas de message quand une operation echoue.');
severityItem('MOYENNE', 'Pas d\'imports dynamiques pour les librairies lourdes (recharts, jspdf) : Temps de chargement plus long.');
severityItem('MOYENNE', 'Console.log et console.error en production : Devrait utiliser un logger structure.');
severityItem('MOYENNE', 'Pas de fichier .env.example : Les nouveaux developpeurs ne savent pas quelles variables configurer.');

addPage();
sectionTitle('Severite BASSE');
severityItem('BASSE', '2 utilisations de "as any" dans le code TypeScript : Facile a corriger.');
severityItem('BASSE', 'Pas d\'attributs d\'accessibilite (ARIA) sur les formulaires complexes.');
severityItem('BASSE', 'Pas de mode sombre (dark mode) configure dans Tailwind.');

// ============================================================
// PAGE 12 - RECOMMANDATIONS
// ============================================================
addPage();
title('11. Recommandations prioritaires');
y += 3;

sectionTitle('Semaine 1 : Securite (URGENT)');
bullet('1. Ajouter .env.local dans .gitignore IMMEDIATEMENT');
bullet('2. Changer TOUS les mots de passe et cles API (ils sont compromis)');
bullet('3. Generer un vrai JWT_SECRET aleatoire (32+ caracteres)');
bullet('4. Configurer les variables d\'environnement sur Vercel (pas dans le code)');
bullet('5. Supprimer le code de debug (debug.log) des routes API');
bullet('6. Corriger la regle Firestore pour "recruitments" (exiger une auth)');
y += 3;

sectionTitle('Semaine 2 : Stabilite');
bullet('1. Ajouter du rate limiting sur les endpoints SMS (5 req/min par IP)');
bullet('2. Ajouter Zod pour valider les entrees de toutes les API');
bullet('3. Creer un fichier .env.example documentant les variables requises');
bullet('4. Ajouter un logger structure (Pino) a la place de console.log');
y += 3;

sectionTitle('Semaine 3 : Tests');
bullet('1. Installer Vitest + React Testing Library');
bullet('2. Ecrire des tests pour l\'authentification client et plombier');
bullet('3. Ecrire des tests pour la normalisation des numeros de telephone');
bullet('4. Configurer l\'emulateur Firebase pour tester les regles Firestore');
y += 3;

sectionTitle('Semaine 4 : Performance');
bullet('1. Ajouter des imports dynamiques pour jsPDF, html2canvas et Recharts');
bullet('2. Installer @next/bundle-analyzer pour mesurer le bundle');
bullet('3. Corriger le probleme N+1 dans auto-messages/send');
bullet('4. Ajouter du lazy loading pour les pages rarement visitees');
y += 3;

sectionTitle('Long terme');
bullet('Configurer Husky + lint-staged pour les pre-commit hooks');
bullet('Ajouter des tests end-to-end avec Playwright');
bullet('Organiser les composants par feature');
bullet('Ajouter le mode sombre');
bullet('Ameliorer l\'accessibilite (ARIA labels, navigation clavier)');

// ============================================================
// PAGE 13 - PLAN D'ACTION
// ============================================================
addPage();
title('12. Plan d\'action pour debutant');
y += 3;

paragraph('Si vous etes debutant et que ce rapport vous semble intimidant, voici par ou commencer, etape par etape :');
y += 3;

sectionTitle('Etape 1 : Proteger vos secrets (30 min)');
paragraph('C\'est la chose la plus urgente. Vos mots de passe sont peut-etre visibles publiquement.');
doc.setFont('courier', 'normal');
doc.setFontSize(8);
doc.setTextColor(...colors.gray);
const steps1 = [
  '# 1. Ajouter .env.local au .gitignore',
  'echo ".env.local" >> .gitignore',
  '',
  '# 2. Supprimer .env.local de git (sans supprimer le fichier)',
  'git rm --cached .env.local',
  '',
  '# 3. Committer le changement',
  'git add .gitignore && git commit -m "fix: remove secrets from git"',
  '',
  '# 4. IMPORTANT : Changer tous vos mots de passe !',
  '# - Firebase : console.firebase.google.com > Parametres',
  '# - Twilio : console.twilio.com > Account',
  '# - Infobip : portal.infobip.com > API Keys',
];
steps1.forEach(line => {
  checkSpace(4);
  doc.text(line, margin + 4, y);
  y += 3.5;
});
doc.setFont('helvetica', 'normal');
y += 5;

sectionTitle('Etape 2 : Configurer Vercel (15 min)');
paragraph('Sur le dashboard Vercel, allez dans Settings > Environment Variables et ajoutez chaque variable de votre .env.local. Comme ca, Vercel connait vos secrets sans qu\'ils soient dans le code.');
y += 3;

sectionTitle('Etape 3 : Corriger le JWT_SECRET (5 min)');
paragraph('Dans votre .env.local, remplacez "change-me..." par une chaine aleatoire. Vous pouvez en generer une avec cette commande :');
doc.setFont('courier', 'normal');
doc.setFontSize(8);
doc.setTextColor(...colors.gray);
checkSpace(4);
doc.text('node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"', margin + 4, y);
y += 6;
doc.setFont('helvetica', 'normal');

sectionTitle('Etape 4 : Supprimer le code de debug (10 min)');
paragraph('Ouvrez le fichier app/api/espace-plombier/instant-offer/route.ts et supprimez les lignes qui ecrivent dans debug.log (lignes avec appendFileSync et DEBUG_LOG).');
y += 3;

sectionTitle('Etape 5 : Premier test (20 min)');
paragraph('Installez Vitest et ecrivez votre premier test pour vous familiariser :');
doc.setFont('courier', 'normal');
doc.setFontSize(8);
doc.setTextColor(...colors.gray);
const steps5 = [
  'npm install -D vitest',
  '',
  '// Creez un fichier lib/__tests__/example.test.ts',
  'import { describe, it, expect } from "vitest";',
  '',
  'describe("Mon premier test", () => {',
  '  it("1 + 1 = 2", () => {',
  '    expect(1 + 1).toBe(2);',
  '  });',
  '});',
  '',
  '// Lancez avec : npx vitest',
];
steps5.forEach(line => {
  checkSpace(4);
  doc.text(line, margin + 4, y);
  y += 3.5;
});
doc.setFont('helvetica', 'normal');

// ============================================================
// LAST PAGE - CONCLUSION
// ============================================================
addPage();
title('Conclusion');
y += 5;

doc.setFillColor(...colors.bg);
doc.roundedRect(margin, y, contentWidth, 40, 3, 3, 'F');
doc.setDrawColor(...colors.primary);
doc.setLineWidth(0.5);
doc.roundedRect(margin, y, contentWidth, 40, 3, 3, 'S');
y += 10;

doc.setFontSize(11);
doc.setFont('helvetica', 'normal');
doc.setTextColor(...colors.dark);
const conclusion = doc.splitTextToSize(
  'CRM Plomberie est un projet ambitieux et bien structure pour un CRM metier. L\'architecture Next.js + Firebase est un bon choix, le TypeScript est bien utilise, et les fonctionnalites sont completes (multi-pays, multi-canal, mobile). Le point faible principal est la securite : les secrets doivent etre proteges en priorite. L\'ajout de tests et l\'optimisation des performances sont les prochaines etapes logiques.',
  contentWidth - 10
);
conclusion.forEach(line => {
  doc.text(line, margin + 5, y);
  y += 5.5;
});
y += 15;

doc.setFontSize(10);
doc.setFont('helvetica', 'bold');
doc.setTextColor(...colors.primary);
doc.text('Score final : 6.2 / 10', margin, y);
y += 8;
doc.setFont('helvetica', 'normal');
doc.setTextColor(...colors.dark);
doc.setFontSize(9.5);
doc.text('Bon potentiel, mais des corrections de securite urgentes sont necessaires.', margin, y);
y += 15;

separator();
doc.setFontSize(8);
doc.setTextColor(...colors.gray);
doc.text('Rapport genere par Claude Code (Opus 4.6) - 8 Mars 2026', pageWidth / 2, y, { align: 'center' });
y += 5;
doc.text('Pour toute question : https://github.com/anthropics/claude-code', pageWidth / 2, y, { align: 'center' });

// Add page numbers to all pages
const totalPages = doc.internal.getNumberOfPages();
for (let i = 1; i <= totalPages; i++) {
  doc.setPage(i);
  doc.setFontSize(8);
  doc.setTextColor(...colors.gray);
  doc.text(`Page ${i} / ${totalPages}`, pageWidth / 2, 293, { align: 'center' });
}

// Save
const output = doc.output('arraybuffer');
fs.writeFileSync('/Users/abderrahimmolatef/app/Rapport_Audit_CRM_Plomberie.pdf', Buffer.from(output));
console.log('PDF generated successfully!');
