# Configuration SMS avec Twilio (Optionnel)

Par défaut, l'application utilise WhatsApp Web pour envoyer des messages. Pour envoyer de vrais SMS, vous pouvez configurer Twilio.

## Installation

```bash
npm install twilio
```

## Configuration Twilio

1. Créez un compte sur [Twilio](https://www.twilio.com/)
2. Obtenez vos identifiants :
   - Account SID
   - Auth Token
   - Numéro de téléphone Twilio (acheté depuis la console Twilio)

## Variables d'environnement

Ajoutez ces variables dans `.env.local` (local) ou dans les paramètres Vercel (production) :

```env
TWILIO_ACCOUNT_SID=votre_account_sid
TWILIO_AUTH_TOKEN=votre_auth_token
TWILIO_PHONE_NUMBER=+33612345678  # Format international avec +
```

## Utilisation

Une fois configuré, les SMS seront envoyés directement via Twilio au lieu d'ouvrir WhatsApp Web.

**Note** : Sans Twilio, l'application ouvre automatiquement WhatsApp Web avec le message pré-rempli, ce qui est pratique pour un usage quotidien.
