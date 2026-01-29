# Configuration du Webhook pour WordPress

## Configuration requise

### 1. Variables d'environnement

Ajoutez ces variables dans votre fichier `.env.local` (développement) et dans les paramètres Vercel (production) :

```env
# Configuration SMTP pour l'envoi d'emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=votre-email@gmail.com
SMTP_PASS=votre-mot-de-passe-app
SMTP_FROM=votre-email@gmail.com

# Clé API secrète pour sécuriser l'endpoint (optionnel mais recommandé)
WEBHOOK_API_KEY=votre-cle-secrete-aleatoire

# Configuration Firebase Admin SDK (Option 1 : Clé de service complète)
# Téléchargez la clé JSON depuis Firebase Console > Paramètres du projet > Comptes de service
# Puis encodez-la en base64 ou utilisez-la directement
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}

# OU Option 2 : Variables individuelles
FIREBASE_PROJECT_ID=votre-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@votre-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 2. Configuration Gmail SMTP

Pour utiliser Gmail comme service SMTP :

1. **Activez la validation en 2 étapes** sur votre compte Google
2. **Créez un "Mot de passe d'application"** :
   - Allez dans votre compte Google > Sécurité
   - Activez la validation en 2 étapes si ce n'est pas déjà fait
   - Allez dans "Mots de passe des applications"
   - Créez un nouveau mot de passe d'application
   - Utilisez ce mot de passe dans `SMTP_PASS`

### 3. Configuration Firebase Admin SDK

#### Option A : Clé de service JSON (Recommandé)

1. Allez dans Firebase Console > Paramètres du projet > Comptes de service
2. Cliquez sur "Générer une nouvelle clé privée"
3. Téléchargez le fichier JSON
4. Encodez le contenu en base64 ou copiez-le directement dans `FIREBASE_SERVICE_ACCOUNT_KEY`

#### Option B : Variables individuelles

1. Dans Firebase Console > Paramètres du projet > Comptes de service
2. Copiez :
   - `Project ID` → `FIREBASE_PROJECT_ID`
   - `Client email` → `FIREBASE_CLIENT_EMAIL`
   - `Private key` → `FIREBASE_PRIVATE_KEY` (gardez les `\n` dans la clé)

### 4. URL de l'API

- **Développement :** `http://localhost:3000/api/webhook/client`
- **Production :** `https://votre-domaine.vercel.app/api/webhook/client`

## Test de l'endpoint

Vous pouvez tester l'endpoint avec curl :

```bash
curl -X POST https://votre-domaine.vercel.app/api/webhook/client \
  -H "Content-Type: application/json" \
  -H "x-api-key: votre-cle-secrete" \
  -d '{
    "name": "Test Client",
    "phone": "0612345678",
    "email": "test@example.com",
    "city": "Casablanca",
    "clientType": "particulier",
    "message": "Test depuis curl"
  }'
```

## Intégration dans WordPress

Voir le fichier `WORDPRESS_FORM_SIMPLE.html` pour le code du formulaire à intégrer dans Elementor.

## Dépannage

### Erreur : "Firebase Admin initialization error"
- Vérifiez que les variables d'environnement Firebase Admin sont correctement configurées
- Vérifiez que la clé privée contient bien les `\n` (retours à la ligne)

### Erreur : "Error sending email"
- Vérifiez les paramètres SMTP
- Pour Gmail, utilisez un "Mot de passe d'application" et non votre mot de passe normal
- Vérifiez que `SMTP_FROM` correspond à `SMTP_USER`

### Erreur : "Missing or insufficient permissions"
- Les règles Firestore actuelles nécessitent une authentification
- L'API utilise Firebase Admin SDK qui contourne ces règles
- Assurez-vous que Firebase Admin SDK est correctement configuré
