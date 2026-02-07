# 🔍 Dépannage Erreur 500 - Envoi SMS

## Problème
Erreur `500 (Internal Server Error)` lors de l'envoi de SMS depuis `https://dash.leplombier.ma/api/client/send-sms`

## Causes possibles

### 1. Variables d'environnement non configurées sur Vercel ⚠️ (Le plus probable)

**Vérification :**
1. Allez sur https://vercel.com
2. Sélectionnez votre projet
3. Allez dans **Settings** → **Environment Variables**
4. Vérifiez que ces 3 variables existent :
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`

**Solution :**
Si les variables n'existent pas, ajoutez-les :
- `TWILIO_ACCOUNT_SID` = `votre-account-sid-ici` (commence par AC...)
- `TWILIO_AUTH_TOKEN` = `votre-auth-token-ici`
- `TWILIO_PHONE_NUMBER` = `+votre-numero-twilio` (format international avec +)

**Important :** Après avoir ajouté les variables, **redéployez** votre application :
1. Allez dans **Deployments**
2. Cliquez sur les 3 points (⋯) du dernier déploiement
3. Sélectionnez **Redeploy**

### 2. Crédit Twilio insuffisant

**Vérification :**
1. Allez sur https://console.twilio.com
2. Vérifiez votre **Balance** dans le dashboard
3. Si le crédit est à 0, ajoutez des fonds

**Solution :**
- Ajoutez des fonds dans votre compte Twilio
- Le compte gratuit offre $15 de crédit pour tester

### 3. Numéro de téléphone invalide

**Vérification :**
- Le numéro doit être au format international avec `+` (ex: `+212612345678`)
- Le numéro Twilio (`+14148955207`) doit être actif dans votre compte

**Solution :**
- Vérifiez que le numéro Twilio est bien actif dans https://console.twilio.com → Phone Numbers
- Vérifiez que le numéro de destination est au bon format

### 4. Package Twilio non installé en production

**Vérification :**
- Le package `twilio` est dans `package.json` ✅
- Vercel devrait l'installer automatiquement lors du build

**Solution :**
- Si le problème persiste, vérifiez les logs de build Vercel
- Assurez-vous que `npm install` s'exécute correctement

## 🔧 Vérification rapide

### Test 1 : Vérifier les variables d'environnement

Créez une route de test temporaire ou vérifiez dans les logs Vercel :

```typescript
// Dans une API route de test
console.log('TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Configuré' : '❌ Manquant');
console.log('TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✅ Configuré' : '❌ Manquant');
console.log('TWILIO_PHONE_NUMBER:', process.env.TWILIO_PHONE_NUMBER || '❌ Manquant');
```

### Test 2 : Vérifier les logs Vercel

1. Allez dans Vercel → votre projet → **Deployments**
2. Cliquez sur le dernier déploiement
3. Allez dans l'onglet **Functions**
4. Cliquez sur `/api/client/send-sms`
5. Regardez les **Logs** pour voir l'erreur exacte

### Test 3 : Tester localement

1. Vérifiez que votre `.env.local` contient les variables Twilio
2. Redémarrez le serveur : `npm run dev`
3. Testez l'envoi d'un SMS depuis la page de test
4. Si ça fonctionne localement mais pas en production → problème de variables Vercel

## 📋 Checklist de résolution

- [ ] Variables Twilio ajoutées dans Vercel (Settings → Environment Variables)
- [ ] Application redéployée après avoir ajouté les variables
- [ ] Crédit Twilio vérifié (console.twilio.com)
- [ ] Numéro Twilio actif et vérifié
- [ ] Format du numéro de destination correct (+212...)
- [ ] Logs Vercel consultés pour voir l'erreur exacte

## 🆘 Si le problème persiste

1. **Consultez les logs Vercel** pour voir l'erreur exacte
2. **Consultez les logs Vercel** après un envoi SMS pour voir le message d'erreur détaillé
3. **Vérifiez le dashboard Twilio** pour voir si des SMS ont été tentés
4. **Contactez le support** avec les logs d'erreur

## 💡 Note

Le code a été amélioré pour :
- Utiliser un import dynamique de Twilio (plus robuste)
- Afficher des messages d'erreur plus détaillés
- Gérer gracieusement l'absence de Twilio (fallback WhatsApp)
