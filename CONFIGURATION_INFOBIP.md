# Configuration Infobip pour l'envoi de SMS

## 📋 Variables d'environnement requises

Ajoutez ces variables dans **Vercel → Settings → Environment Variables** :

### Variables obligatoires

1. **INFOBIP_API_KEY**
   - Valeur : `votre-cle-api-infobip-ici`
   - Description : Clé API Infobip pour l'authentification

2. **INFOBIP_BASE_URL**
   - Valeur : `m9mmd2.api.infobip.com`
   - Description : URL de base de l'API Infobip (sans https://, ajouté automatiquement)

### Variable optionnelle

3. **INFOBIP_SENDER** (optionnel)
   - Valeur : `CRM` (ou le nom de votre entreprise)
   - Description : Nom de l'expéditeur affiché dans les SMS
   - Par défaut : `CRM` si non défini

## 🚀 Étapes de configuration sur Vercel

1. **Accédez à votre projet Vercel**
   - Allez sur https://vercel.com
   - Connectez-vous et sélectionnez votre projet

2. **Ouvrez les paramètres**
   - Cliquez sur **Settings** dans le menu de gauche
   - Cliquez sur **Environment Variables**

3. **Ajoutez les variables**
   - Cliquez sur **"Add New"**
   - **Key** : `INFOBIP_API_KEY`
   - **Value** : `votre-cle-api-infobip-ici` (remplacez par votre vraie clé API)
   - Cochez les 3 environnements : **Production**, **Preview**, **Development**
   - Cliquez sur **Save**

   - Cliquez à nouveau sur **"Add New"**
   - **Key** : `INFOBIP_BASE_URL`
   - **Value** : `m9mmd2.api.infobip.com`
   - Cochez les 3 environnements
   - Cliquez sur **Save**

   - (Optionnel) Cliquez sur **"Add New"**
   - **Key** : `INFOBIP_SENDER`
   - **Value** : `GROUPE OGINCE` (ou votre nom d'entreprise)
   - Cochez les 3 environnements
   - Cliquez sur **Save**

4. **Redéployez l'application**
   - Allez dans **Deployments**
   - Cliquez sur les 3 points (⋯) à droite du dernier déploiement
   - Cliquez sur **"Redeploy"**

## ✅ Vérification

Pour tester la configuration :

1. Allez sur votre application (tableau de bord ou messages automatiques)
2. Déclenchez un envoi SMS (message automatique ou appel API `/api/client/send-sms`)
3. Utilisez un numéro marocain (ex: `0612345678` ou `+212612345678`)
4. Vous devriez recevoir l'SMS si la configuration est correcte

## 🔍 Format des numéros de téléphone

L'application normalise automatiquement les numéros au format E.164. Formats acceptés :

- `+212612345678` (format international avec +)
- `00212612345678` (format international avec 00)
- `0612345678` (format local marocain avec 0)
- `612345678` (format local marocain sans 0)

Tous ces formats seront automatiquement convertis en `+212612345678`.

## 📊 Endpoint API utilisé

L'application utilise l'endpoint Infobip :
- **URL** : `https://m9mmd2.api.infobip.com/sms/2/text/single`
- **Méthode** : `POST`
- **Headers** :
  - `Authorization: App {INFOBIP_API_KEY}`
  - `Content-Type: application/json`
  - `Accept: application/json`
- **Body** :
  ```json
  {
    "from": "CRM",
    "to": "+212612345678",
    "text": "Votre message"
  }
  ```

## ⚠️ Dépannage

### Erreur : "INFOBIP_API_KEY is not defined"
- Vérifiez que la variable `INFOBIP_API_KEY` est bien ajoutée dans Vercel
- Vérifiez que vous avez redéployé après avoir ajouté la variable

### Erreur : "INFOBIP_BASE_URL is not defined"
- Vérifiez que la variable `INFOBIP_BASE_URL` est bien ajoutée dans Vercel
- Vérifiez que vous avez redéployé après avoir ajouté la variable

### Erreur : "401 Unauthorized"
- Vérifiez que la clé API est correcte
- Vérifiez que la clé API n'a pas expiré

### Erreur : "400 Bad Request"
- Vérifiez le format du numéro de téléphone (doit être en E.164 : +212...)
- Vérifiez que le message n'est pas vide
- Vérifiez que le nom de l'expéditeur (INFOBIP_SENDER) est valide

### Le SMS n'arrive pas
- Vérifiez que le numéro de téléphone est correct
- Vérifiez les logs dans Vercel (Functions → `/api/client/send-sms` → Logs)
- Vérifiez votre compte Infobip pour voir les tentatives d'envoi

## 🔗 Liens utiles

- [Documentation Infobip SMS API](https://www.infobip.com/docs/api/channels/sms/sms-messaging/outbound-sms/send-sms-message)
- [Console Infobip](https://portal.infobip.com/)
- [Support Infobip](https://www.infobip.com/support)

## 📝 Notes importantes

- Les variables d'environnement sont **sensibles** : ne les partagez jamais publiquement
- La clé API Infobip permet d'envoyer des SMS à n'importe quel numéro (pas de limitation sandbox comme Twilio)
- Infobip supporte nativement l'envoi vers le Maroc (+212)
- Les SMS sont facturés selon le tarif Infobip pour le Maroc
