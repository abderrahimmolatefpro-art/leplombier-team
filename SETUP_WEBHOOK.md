# 🚀 Configuration Rapide du Webhook

## Étape 1 : Ajouter les variables dans `.env.local`

Ouvrez votre fichier `.env.local` et ajoutez ces lignes à la fin :

```env
# ============================================
# CONFIGURATION WEBHOOK WORDPRESS
# ============================================

# Configuration SMTP pour l'envoi d'emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-app-gmail
SMTP_FROM=votre-email@gmail.com

# Clé API secrète (optionnel mais recommandé)
# Générez une clé : openssl rand -hex 32
WEBHOOK_API_KEY=

# Firebase Admin SDK - Copiez cette ligne complète (sur une seule ligne)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"votre-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-xxxxx@votre-project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"...","universe_domain":"googleapis.com"}
```

**⚠️ IMPORTANT :**
- La ligne `FIREBASE_SERVICE_ACCOUNT_KEY` doit être sur **une seule ligne** (sans retours à la ligne)
- Ne supprimez pas les `\n` dans la `private_key` - ils sont nécessaires

## Étape 2 : Configurer Gmail SMTP

1. Allez sur [Google Account](https://myaccount.google.com/)
2. Sécurité > Validation en 2 étapes (activez-la si ce n'est pas déjà fait)
3. Sécurité > Mots de passe des applications
4. Créez un nouveau mot de passe d'application (choisissez "Autre" et nommez-le "CRM Webhook")
5. Copiez le mot de passe généré et utilisez-le dans `SMTP_PASS`

## Étape 3 : Redémarrer le serveur

```bash
npm run dev
```

## Étape 4 : Tester

Testez l'endpoint avec curl :

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

Vous devriez voir :
- ✅ Le client créé dans Firestore
- ✅ Un email envoyé à `ogincema@gmail.com`

## Étape 5 : Intégrer dans WordPress

1. Ouvrez `WORDPRESS_FORM_SIMPLE.html`
2. Remplacez `API_URL` ligne 340 par :
   - **Développement :** `http://localhost:3000/api/webhook/client`
   - **Production :** `https://votre-domaine.vercel.app/api/webhook/client`
3. Si vous avez configuré `WEBHOOK_API_KEY`, ajoutez-la ligne 341
4. Copiez tout le code dans un widget HTML d'Elementor

## 🚀 Déploiement sur Vercel

N'oubliez pas d'ajouter toutes ces variables dans Vercel :
- Settings > Environment Variables
- Ajoutez toutes les variables (SMTP, Firebase Admin, etc.)
