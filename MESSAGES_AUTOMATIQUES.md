# Messages Automatiques

## Description

Le système de messages automatiques permet d'envoyer des SMS et emails automatiquement après qu'une intervention (projet ou dépannage) soit terminée.

## Fonctionnalités

- **Gestion des messages** : Créer, modifier, activer/désactiver des messages automatiques
- **Types de messages** :
  - **Promotion** : Messages promotionnels (ex: "leplombier.ma vous offre 10% sur votre prochain commande")
  - **Avertissement** : Messages d'avertissement (ex: "Attention chaque intervention faite directement par nos plombiers sans passer par la société vous risquez de perdre votre garantie...")
- **Délai configurable** : Définir le délai d'envoi (par défaut 24 heures après la fin de l'intervention)
- **SMS et Email** : Activer/désactiver indépendamment l'envoi SMS et Email
- **Suivi** : Historique des messages envoyés dans la collection `sentMessages`

## Configuration

### 1. Créer un message automatique

1. Aller dans **Messages auto** (menu admin)
2. Cliquer sur **Nouveau message**
3. Remplir les informations :
   - **Nom** : Nom du message (ex: "Promotion 10%")
   - **Type** : Promotion ou Avertissement
   - **Délai d'envoi** : Nombre d'heures après la fin de l'intervention (par défaut 24h)
   - **Activer SMS** : Cocher pour activer l'envoi SMS
   - **Contenu SMS** : Texte du SMS (max 160 caractères)
   - **Activer Email** : Cocher pour activer l'envoi Email
   - **Sujet Email** : Sujet de l'email
   - **Contenu Email** : Contenu HTML de l'email

### 2. Exemples de messages

#### Message Promotion
- **Nom** : Promotion 10%
- **Type** : Promotion
- **SMS** : "leplombier.ma vous offre 10% sur votre prochain commande. Code: PROMO10"
- **Email** : 
  - Sujet : "Offre spéciale - 10% de réduction"
  - Contenu : "Bonjour, leplombier.ma vous offre 10% de réduction sur votre prochaine commande. Utilisez le code PROMO10 lors de votre prochaine intervention."

#### Message Avertissement
- **Nom** : Avertissement garantie
- **Type** : Avertissement
- **SMS** : "Attention: chaque intervention faite directement par nos plombiers sans passer par la société vous risquez de perdre votre garantie. Nous ne sommes pas responsables en cas de vol ou comportement inapproprié."
- **Email** :
  - Sujet : "Important - Garantie de vos interventions"
  - Contenu : "Bonjour, nous tenons à vous rappeler que chaque intervention faite directement par nos plombiers sans passer par la société vous risquez de perdre votre garantie. Nous ne sommes pas responsables en cas de vol ou comportement inapproprié. Pour bénéficier de notre garantie, contactez-nous au +212 706 404 147."

## Configuration automatique (Cron Job)

Pour que les messages soient envoyés automatiquement, vous devez configurer un cron job qui appelle l'API `/api/auto-messages/send` périodiquement.

### Option 1: Vercel Cron Jobs (Recommandé)

1. Créer un fichier `vercel.json` à la racine du projet :

```json
{
  "crons": [
    {
      "path": "/api/auto-messages/send",
      "schedule": "0 */1 * * *"
    }
  ]
}
```

Cela exécutera le script toutes les heures. Vous pouvez ajuster la fréquence :
- `0 */1 * * *` : Toutes les heures
- `0 */6 * * *` : Toutes les 6 heures
- `0 0 * * *` : Une fois par jour à minuit

2. Déployer sur Vercel

### Option 2: Service externe (cron-job.org, EasyCron, etc.)

1. Créer un compte sur un service de cron job
2. Configurer une tâche qui appelle : `https://votre-domaine.com/api/auto-messages/send`
3. Méthode : POST
4. Fréquence : Toutes les heures (ou selon vos besoins)

### Option 3: Test manuel

Vous pouvez tester manuellement en cliquant sur le bouton **"Envoyer maintenant"** dans la page de gestion des messages automatiques.

## Logique d'envoi

Le système vérifie :
1. **Projets terminés** : Les projets avec `status === 'termine'` dont la date de fin (`endDate` ou `updatedAt`) est antérieure au délai configuré
2. **Dépannages** : Les `manualRevenues` dont la date est antérieure au délai configuré
3. **Messages déjà envoyés** : Le système vérifie dans `sentMessages` si un message a déjà été envoyé pour cette intervention pour éviter les doublons
4. **Client valide** : Le client doit avoir un numéro de téléphone (pour SMS) et/ou un email (pour Email)

## Collections Firestore

### `autoMessages`
Stocke les messages automatiques configurés.

### `sentMessages`
Historique des messages envoyés avec :
- `autoMessageId` : ID du message automatique utilisé
- `clientId` : ID du client
- `projectId` : ID du projet (si applicable)
- `manualRevenueId` : ID du dépannage (si applicable)
- `type` : 'sms' ou 'email'
- `status` : 'sent' ou 'failed'
- `sentAt` : Date d'envoi
- `errorMessage` : Message d'erreur (si échec)

## Variables d'environnement requises

Pour que les SMS et emails fonctionnent, vous devez configurer les variables d'environnement suivantes.

---

## 📧 Configuration Email (SMTP) - Étape par étape

### Option 1: Gmail (Recommandé pour débuter)

1. **Activer l'authentification à deux facteurs** sur votre compte Gmail
   - Allez sur https://myaccount.google.com/security
   - Activez la "Validation en deux étapes"

2. **Créer un mot de passe d'application**
   - Allez sur https://myaccount.google.com/apppasswords
   - Sélectionnez "Autre (nom personnalisé)" et entrez "CRM Plomberie"
   - Cliquez sur "Générer"
   - **Copiez le mot de passe généré** (16 caractères sans espaces)

3. **Configurer les variables dans votre projet**

   **Pour le développement local** (fichier `.env.local`) :
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=votre-email@gmail.com
   SMTP_PASS=votre-mot-de-passe-application-16-caracteres
   SMTP_FROM=votre-email@gmail.com
   ```

   **Pour Vercel (production)** :
   - Allez dans votre projet Vercel
   - Settings → Environment Variables
   - Ajoutez chaque variable une par une :
     - `SMTP_HOST` = `smtp.gmail.com`
     - `SMTP_PORT` = `587`
     - `SMTP_SECURE` = `false`
     - `SMTP_USER` = `votre-email@gmail.com`
     - `SMTP_PASS` = `votre-mot-de-passe-application`
     - `SMTP_FROM` = `votre-email@gmail.com`

### Option 2: Autre service SMTP (OVH, SendGrid, Mailgun, etc.)

1. **Récupérer les informations SMTP** de votre fournisseur
   - Connectez-vous à votre compte
   - Cherchez la section "SMTP" ou "Configuration email"
   - Notez : serveur SMTP, port, nom d'utilisateur, mot de passe

2. **Configurer les variables**

   Exemple pour OVH :
   ```env
   SMTP_HOST=ssl0.ovh.net
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=votre-email@votre-domaine.com
   SMTP_PASS=votre-mot-de-passe
   SMTP_FROM=votre-email@votre-domaine.com
   ```

   Exemple pour SendGrid :
   ```env
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey
   SMTP_PASS=votre-api-key-sendgrid
   SMTP_FROM=votre-email@votre-domaine.com
   ```

### ✅ Tester la configuration email

1. Allez sur la page d'un client dans le CRM
2. Cliquez sur "Envoyer un email"
3. Remplissez le formulaire et envoyez
4. Vérifiez que l'email arrive bien dans la boîte de réception

---

## 📱 Configuration SMS (Twilio) - Étape par étape

### Étape 1: Créer un compte Twilio

1. Allez sur https://www.twilio.com/try-twilio
2. Créez un compte gratuit (vous recevrez $15 de crédit pour tester)
3. Vérifiez votre numéro de téléphone

### Étape 2: Récupérer vos identifiants

1. Une fois connecté, allez sur le **Dashboard** de Twilio
2. Vous verrez votre **Account SID** et **Auth Token**
   - **Account SID** : Commence par `AC...`
   - **Auth Token** : Cliquez sur "view" pour le voir

3. **Obtenir un numéro de téléphone Twilio**
   - Allez dans "Phone Numbers" → "Buy a number"
   - Choisissez un pays (ex: Maroc si disponible, sinon USA/Canada)
   - Sélectionnez un numéro et achetez-le (gratuit avec le crédit de départ)

### Étape 3: Configurer les variables

**Pour le développement local** (fichier `.env.local`) :
```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=votre-auth-token-ici
TWILIO_PHONE_NUMBER=+1234567890
```

**Pour Vercel (production)** :
- Allez dans votre projet Vercel
- Settings → Environment Variables
- Ajoutez :
  - `TWILIO_ACCOUNT_SID` = `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
  - `TWILIO_AUTH_TOKEN` = `votre-auth-token`
  - `TWILIO_PHONE_NUMBER` = `+1234567890` (format international avec +)

### Étape 4: Installer le package Twilio (si nécessaire)

Si vous avez des erreurs, installez Twilio :
```bash
npm install twilio
```

### ✅ Tester la configuration SMS

1. Allez sur la page d'un client dans le CRM
2. Cliquez sur "Envoyer un SMS"
3. Remplissez le formulaire et envoyez
4. Vérifiez que le SMS arrive bien sur le téléphone du client

### ⚠️ Alternative sans Twilio

Si vous ne configurez pas Twilio, le système générera automatiquement une **URL WhatsApp Web** que vous pouvez ouvrir pour envoyer le message manuellement.

---

## 🔥 Configuration Firebase Admin (pour l'API route)

### Option 1: Service Account Key (Recommandé)

1. **Télécharger la clé de service**
   - Allez sur https://console.firebase.google.com/
   - Sélectionnez votre projet
   - Paramètres du projet (⚙️) → "Comptes de service"
   - Cliquez sur "Générer une nouvelle clé privée"
   - Un fichier JSON sera téléchargé

2. **Convertir en string JSON**
   - Ouvrez le fichier JSON
   - Copiez tout son contenu
   - Pour Vercel, collez-le directement dans la variable `FIREBASE_SERVICE_ACCOUNT_KEY`
   - **Important** : Gardez le format JSON valide (pas besoin de l'échapper)

   **Pour Vercel** :
   - Variable : `FIREBASE_SERVICE_ACCOUNT_KEY`
   - Valeur : Le contenu complet du fichier JSON (collé tel quel)

### Option 2: Variables individuelles

Si vous préférez utiliser des variables séparées :

1. Dans le fichier JSON téléchargé, notez :
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (gardez les `\n`)

2. **Pour Vercel**, ajoutez les 3 variables :
   - `FIREBASE_PROJECT_ID` = `votre-project-id`
   - `FIREBASE_CLIENT_EMAIL` = `firebase-adminsdk-xxxxx@xxxxx.iam.gserviceaccount.com`
   - `FIREBASE_PRIVATE_KEY` = `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n`

---

## 📝 Résumé des variables à configurer

### Minimum requis (Email uniquement)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASS=mot-de-passe-application
SMTP_FROM=votre-email@gmail.com
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

### Complet (Email + SMS)
```env
# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASS=mot-de-passe-application
SMTP_FROM=votre-email@gmail.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=votre-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Firebase Admin
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```

---

## 🧪 Vérifier que tout fonctionne

1. **Redémarrer le serveur** après avoir ajouté les variables :
   ```bash
   npm run dev
   ```

2. **Tester l'email** :
   - Aller sur un client → "Envoyer un email"
   - Vérifier la réception

3. **Tester le SMS** :
   - Aller sur un client → "Envoyer un SMS"
   - Vérifier la réception

4. **Tester les messages automatiques** :
   - Aller dans "Messages auto"
   - Cliquer sur "Envoyer maintenant"
   - Vérifier les logs dans la console

---

## ❓ Problèmes courants

### Email ne part pas
- Vérifiez que le mot de passe d'application est correct (Gmail)
- Vérifiez que `SMTP_SECURE` correspond au port (587 = false, 465 = true)
- Vérifiez les logs dans la console du navigateur

### SMS ne part pas
- Vérifiez que Twilio est bien installé : `npm install twilio`
- Vérifiez que le numéro Twilio est au bon format (+1234567890)
- Vérifiez votre crédit Twilio dans le dashboard

### Messages automatiques ne s'envoient pas
- Vérifiez que le cron job est configuré dans Vercel
- Vérifiez que `FIREBASE_SERVICE_ACCOUNT_KEY` est bien configuré
- Testez manuellement avec le bouton "Envoyer maintenant"
