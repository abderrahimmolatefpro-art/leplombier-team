# Configuration Twilio - Guide rapide

## ✅ Configuration locale (Développement)

Les variables Twilio doivent être ajoutées à votre fichier `.env.local` :

```env
TWILIO_ACCOUNT_SID=votre-account-sid-ici
TWILIO_AUTH_TOKEN=votre-auth-token-ici
TWILIO_PHONE_NUMBER=+votre-numero-twilio
```

Le package `twilio` a été installé.

## 🚀 Configuration Vercel (Production)

Pour que les SMS fonctionnent en production, vous devez ajouter ces variables dans Vercel :

### Étape 1 : Accéder aux variables d'environnement

1. Allez sur https://vercel.com
2. Connectez-vous et sélectionnez votre projet
3. Allez dans **Settings** → **Environment Variables**

### Étape 2 : Ajouter les variables Twilio

Ajoutez ces 3 variables une par une :

**Variable 1 :**
- **Name** : `TWILIO_ACCOUNT_SID`
- **Value** : `votre-account-sid-ici` (commence par AC...)
- **Environments** : Cochez Production, Preview, Development

**Variable 2 :**
- **Name** : `TWILIO_AUTH_TOKEN`
- **Value** : `votre-auth-token-ici`
- **Environments** : Cochez Production, Preview, Development

**Variable 3 :**
- **Name** : `TWILIO_PHONE_NUMBER`
- **Value** : `+votre-numero-twilio` (format international avec +)
- **Environments** : Cochez Production, Preview, Development

### Étape 3 : Redéployer

Après avoir ajouté les variables :
1. Allez dans **Deployments**
2. Cliquez sur les 3 points (⋯) du dernier déploiement
3. Sélectionnez **Redeploy**
4. Attendez que le déploiement se termine

## 🧪 Tester la configuration

### Test local

1. Redémarrez votre serveur de développement :
   ```bash
   npm run dev
   ```

2. Allez sur la page d'un client dans le CRM
3. Cliquez sur "Envoyer un SMS"
4. Remplissez le formulaire et envoyez
5. Vérifiez que le SMS arrive bien sur le téléphone du client

### Test en production

1. Attendez que le redéploiement Vercel soit terminé
2. Allez sur votre site en production
3. Testez l'envoi d'un SMS depuis la page d'un client

## ⚠️ Notes importantes

- **Sécurité** : Ne partagez jamais vos identifiants Twilio publiquement
- **Crédit** : Vérifiez votre crédit Twilio dans le dashboard : https://console.twilio.com
- **Numéro** : Le numéro `+14148955207` est un numéro Twilio (probablement USA/Canada). Assurez-vous qu'il peut envoyer des SMS vers le Maroc
- **Format** : Le numéro de téléphone doit être au format international avec le `+` (ex: `+212612345678` pour le Maroc)

## 🔍 Vérifier le statut Twilio

1. Allez sur https://console.twilio.com
2. Connectez-vous avec votre compte
3. Vérifiez :
   - **Balance** : Votre crédit disponible
   - **Phone Numbers** : Votre numéro actif
   - **Logs** : Historique des SMS envoyés

## ❓ Problèmes courants

### "Twilio non installé"
- Solution : Le package est déjà installé. Si vous voyez encore cette erreur, redémarrez le serveur.

### "Invalid phone number"
- Vérifiez que le numéro est au format international avec `+` (ex: `+212612345678`)

### "Insufficient funds"
- Vérifiez votre crédit Twilio dans le dashboard
- Ajoutez des fonds si nécessaire

### SMS ne part pas en production
- Vérifiez que les variables sont bien configurées dans Vercel
- Vérifiez que vous avez redéployé après avoir ajouté les variables
- Vérifiez les logs Vercel pour voir les erreurs

## 📝 Résumé

✅ **Local** : Configuré dans `.env.local`  
⏳ **Vercel** : À configurer manuellement dans Settings → Environment Variables  
✅ **Package** : `twilio` installé  

Une fois les variables ajoutées dans Vercel et le projet redéployé, les SMS fonctionneront automatiquement !
