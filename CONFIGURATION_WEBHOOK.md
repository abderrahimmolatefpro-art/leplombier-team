# Configuration du Webhook - Guide Rapide

## ✅ Étape 1 : Ajouter les variables d'environnement

Ouvrez votre fichier `.env.local` et ajoutez ces lignes :

```env
# Configuration SMTP pour l'envoi d'emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-app-gmail
SMTP_FROM=votre-email@gmail.com

# Clé API secrète (optionnel mais recommandé)
# Générez une clé : openssl rand -hex 32
WEBHOOK_API_KEY=votre-cle-secrete-aleatoire

# Firebase Admin SDK - Option 1 (RECOMMANDÉ)
# Copiez tout le JSON du service account en une seule ligne
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"votre-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@votre-project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"...","universe_domain":"googleapis.com"}
```

**⚠️ IMPORTANT :** 
- Le `FIREBASE_SERVICE_ACCOUNT_KEY` doit être sur **une seule ligne** (sans retours à la ligne)
- Gardez tous les `\n` dans la `private_key` (ne les supprimez pas)

## ✅ Étape 2 : Configurer Gmail SMTP

1. **Activez la validation en 2 étapes** sur votre compte Google
2. **Créez un "Mot de passe d'application"** :
   - Allez dans votre compte Google > Sécurité
   - Activez la validation en 2 étapes si ce n'est pas déjà fait
   - Allez dans "Mots de passe des applications"
   - Créez un nouveau mot de passe d'application
   - Utilisez ce mot de passe dans `SMTP_PASS` (pas votre mot de passe Gmail normal)

## ✅ Étape 3 : Redémarrer le serveur

```bash
npm run dev
```

## ✅ Étape 4 : Tester l'endpoint

Testez avec curl ou Postman :

```bash
curl -X POST http://localhost:3000/api/webhook/client \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Client",
    "phone": "0612345678",
    "email": "test@example.com",
    "city": "Casablanca",
    "clientType": "particulier",
    "message": "Test depuis curl"
  }'
```

## ✅ Étape 5 : Intégrer dans WordPress

1. Ouvrez le fichier `WORDPRESS_FORM_SIMPLE.html`
2. Remplacez `API_URL` par votre URL d'API :
   - **Développement :** `http://localhost:3000/api/webhook/client`
   - **Production :** `https://votre-domaine.vercel.app/api/webhook/client`
3. Si vous avez configuré `WEBHOOK_API_KEY`, ajoutez-la dans le JavaScript
4. Copiez tout le code dans un widget HTML d'Elementor

## 📧 Vérification

Après avoir soumis le formulaire :
- ✅ Le client devrait apparaître dans le CRM
- ✅ Vous devriez recevoir un email à `ogincema@gmail.com`

## 🚀 Déploiement sur Vercel

N'oubliez pas d'ajouter toutes ces variables d'environnement dans les paramètres Vercel :
- Settings > Environment Variables
- Ajoutez toutes les variables SMTP et Firebase Admin
