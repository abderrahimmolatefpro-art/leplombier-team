# 🚀 Guide de déploiement sur Vercel

## 📋 Prérequis

- ✅ Un compte GitHub (déjà fait - votre code est sur GitHub)
- ✅ Un compte Vercel (gratuit) - [Créer un compte](https://vercel.com/signup)
- ✅ Votre projet Firebase configuré

## 🎯 Méthode 1 : Déploiement via l'interface Vercel (Recommandé)

### Étape 1 : Créer un compte Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Cliquez sur **"Sign Up"**
3. Choisissez **"Continue with GitHub"**
4. Autorisez Vercel à accéder à votre compte GitHub

### Étape 2 : Importer votre projet

1. Dans le dashboard Vercel, cliquez sur **"Add New Project"**
2. Vous verrez la liste de vos repositories GitHub
3. Trouvez **`leplombier-team`** et cliquez sur **"Import"**

### Étape 3 : Configuration du projet

Vercel détectera automatiquement :
- ✅ Framework : Next.js
- ✅ Build Command : `npm run build`
- ✅ Output Directory : `.next`

**Vous pouvez laisser les paramètres par défaut** ou ajuster si nécessaire.

### Étape 4 : Configurer les variables d'environnement

**⚠️ IMPORTANT :** Avant de déployer, configurez toutes les variables d'environnement.

1. Dans la section **"Environment Variables"**, cliquez sur **"Add"**
2. Ajoutez **une par une** toutes ces variables :

#### Variables Firebase (déjà configurées dans votre projet)

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBaoT7az7RUVnTNYl3QDNXwm8uE7_XBUho
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=leplombier-team.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=leplombier-team
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=leplombier-team.firebaseapp.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=615998762684
NEXT_PUBLIC_FIREBASE_APP_ID=1:615998762684:web:1b72220d03e95dfe25eab9
```

#### Variables SMTP (pour l'envoi d'emails)

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-app-gmail
SMTP_FROM=votre-email@gmail.com
```

#### Variables Firebase Admin SDK

**Option 1 : Clé de service complète (Recommandé)**

```
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"leplombier-team",...}
```

**⚠️ IMPORTANT :** Copiez tout le JSON sur **une seule ligne** (sans retours à la ligne)

**Option 2 : Variables individuelles**

```
FIREBASE_PROJECT_ID=leplombier-team
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@leplombier-team.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

#### Variable optionnelle : Clé API Webhook

```
WEBHOOK_API_KEY=votre-cle-secrete-aleatoire
```

**Note :** Pour chaque variable, sélectionnez les environnements :
- ✅ Production
- ✅ Preview
- ✅ Development

### Étape 5 : Déployer

1. Cliquez sur **"Deploy"**
2. Attendez 2-3 minutes que le déploiement se termine
3. Vercel vous donnera une URL : `https://votre-projet.vercel.app`

### Étape 6 : Configurer Firebase pour la production

1. Allez dans [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet **leplombier-team**
3. Allez dans **Authentication** > **Settings** > **Authorized domains**
4. Cliquez sur **"Add domain"**
5. Ajoutez votre domaine Vercel : `votre-projet.vercel.app`
6. Cliquez sur **"Add"**

## 🎯 Méthode 2 : Déploiement via CLI (Alternative)

### Étape 1 : Installer Vercel CLI

```bash
npm install -g vercel
```

### Étape 2 : Se connecter

```bash
vercel login
```

### Étape 3 : Déployer

```bash
cd /Users/abderrahimmolatef/crm
vercel
```

Suivez les instructions :
- Link to existing project? → **No** (première fois)
- Project name? → **leplombier-team** (ou laissez le nom par défaut)
- Directory? → **./** (racine du projet)

### Étape 4 : Configurer les variables d'environnement

```bash
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY
# Entrez la valeur quand demandé
# Répétez pour toutes les variables
```

Ou via l'interface web (plus facile) :
1. Allez sur [vercel.com/dashboard](https://vercel.com/dashboard)
2. Sélectionnez votre projet
3. Allez dans **Settings** > **Environment Variables**
4. Ajoutez toutes les variables

### Étape 5 : Déployer en production

```bash
vercel --prod
```

## ✅ Vérification après déploiement

### 1. Tester l'application

1. Ouvrez l'URL fournie par Vercel : `https://votre-projet.vercel.app`
2. Vous devriez voir la page de connexion ou de setup
3. Testez la connexion

### 2. Tester le webhook

```bash
curl -X POST https://votre-projet.vercel.app/api/webhook/client \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Client",
    "phone": "0612345678",
    "email": "test@example.com",
    "city": "Casablanca",
    "clientType": "particulier",
    "message": "Test depuis Vercel"
  }'
```

Vous devriez recevoir :
```json
{"success":true,"message":"Client créé avec succès","clientId":"...","isNew":true}
```

### 3. Vérifier les logs

1. Dans Vercel Dashboard, allez dans **Deployments**
2. Cliquez sur le dernier déploiement
3. Allez dans l'onglet **"Functions"** pour voir les logs de l'API

## 🔄 Mises à jour futures

### Déploiement automatique

À chaque **push sur la branche `main`**, Vercel déploiera automatiquement une nouvelle version.

### Déploiement manuel

```bash
git add .
git commit -m "Votre message"
git push origin main
```

Vercel détectera automatiquement le push et redéploiera.

## 🐛 Dépannage

### Erreur : "Build failed"

1. **Vérifiez les logs de build** dans Vercel Dashboard
2. **Vérifiez que toutes les variables d'environnement sont configurées**
3. **Vérifiez que `package.json` contient toutes les dépendances**

### Erreur : "Missing environment variables"

1. Allez dans **Settings** > **Environment Variables**
2. Vérifiez que toutes les variables sont ajoutées
3. Vérifiez que les environnements sont sélectionnés (Production, Preview, Development)

### Erreur : "Firebase Admin initialization error"

1. Vérifiez que `FIREBASE_SERVICE_ACCOUNT_KEY` est sur **une seule ligne**
2. Vérifiez que tous les `\n` sont présents dans la `private_key`
3. Vérifiez que le JSON est valide

### L'application fonctionne mais le webhook ne fonctionne pas

1. Vérifiez les logs dans **Functions** > **api/webhook/client**
2. Vérifiez que Firebase Admin SDK est correctement configuré
3. Testez avec curl pour voir l'erreur exacte

## 📝 Domaines personnalisés (Optionnel)

Si vous avez un domaine personnalisé :

1. Dans Vercel Dashboard, allez dans **Settings** > **Domains**
2. Cliquez sur **"Add"**
3. Entrez votre domaine (ex: `crm.leplombier.ma`)
4. Suivez les instructions pour configurer les DNS

## 🎉 Résultat

Après le déploiement, vous aurez :
- ✅ Application accessible sur `https://votre-projet.vercel.app`
- ✅ Webhook accessible sur `https://votre-projet.vercel.app/api/webhook/client`
- ✅ Déploiements automatiques à chaque push
- ✅ HTTPS automatique
- ✅ CDN global pour des performances optimales

## 🔗 Liens utiles

- [Documentation Vercel](https://vercel.com/docs)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Firebase Console](https://console.firebase.google.com/)
