# Guide de dépannage : Erreur Twilio 21612

## 🔴 Erreur
```
Twilio error: Message cannot be sent with the current combination of 'To' (+21270640XXXX) and/or 'From' (+14148955207) parameters
Code: 21612
```

## 📋 Causes possibles

### 1. **Compte Twilio en mode Sandbox/Test** (Cause la plus fréquente)
Si votre compte Twilio est en mode **Sandbox** (compte d'essai), vous ne pouvez envoyer des SMS qu'à des numéros **vérifiés** dans votre compte Twilio.

**Solution :**
1. Connectez-vous à votre [Console Twilio](https://console.twilio.com/)
2. Allez dans **Phone Numbers** → **Manage** → **Verified Caller IDs**
3. Ajoutez les numéros marocains que vous souhaitez utiliser pour les tests
4. **OU** passez à un compte Twilio payant pour envoyer à n'importe quel numéro

### 2. **Permissions géographiques manquantes**
Votre compte Twilio n'a peut-être pas les permissions pour envoyer vers le Maroc (+212).

**Solution :**
1. Connectez-vous à votre [Console Twilio](https://console.twilio.com/)
2. Allez dans **Settings** → **Geo Permissions**
3. Vérifiez que le **Maroc** est autorisé
4. Si ce n'est pas le cas, activez-le (peut nécessiter un compte payant)

### 3. **Numéro Twilio non activé pour l'international**
Le numéro Twilio (+14148955207) n'est peut-être pas configuré pour envoyer des SMS internationaux.

**Solution :**
1. Connectez-vous à votre [Console Twilio](https://console.twilio.com/)
2. Allez dans **Phone Numbers** → **Manage** → **Active Numbers**
3. Cliquez sur votre numéro (+14148955207)
4. Vérifiez que les **SMS** sont activés
5. Vérifiez que l'envoi **international** est autorisé

### 4. **Format du numéro incorrect**
Le numéro de destination n'est peut-être pas dans le bon format E.164.

**Note :** Le code a été amélioré pour normaliser automatiquement les numéros au format E.164. Les formats suivants sont acceptés :
- `+212612345678` (format international avec +)
- `00212612345678` (format international avec 00)
- `0612345678` (format local marocain avec 0)
- `612345678` (format local marocain sans 0)

Tous ces formats seront automatiquement convertis en `+212612345678`.

## 🔍 Vérifications à faire

### Vérification 1 : Type de compte Twilio
1. Allez sur [Console Twilio](https://console.twilio.com/)
2. Regardez en haut à droite : voyez-vous "Trial" ou "Sandbox" ?
3. Si oui, vous êtes en mode test et devez soit :
   - Vérifier les numéros de destination
   - Passer à un compte payant

### Vérification 2 : Permissions géographiques
1. Allez dans **Settings** → **Geo Permissions**
2. Cherchez "Morocco" ou "Maroc"
3. Vérifiez qu'il est autorisé

### Vérification 3 : Configuration du numéro
1. Allez dans **Phone Numbers** → **Manage** → **Active Numbers**
2. Cliquez sur votre numéro
3. Vérifiez :
   - ✅ **Voice & Fax** : Activé (si nécessaire)
   - ✅ **SMS** : Activé
   - ✅ **International** : Activé

## 🚀 Solutions rapides

### Solution 1 : Vérifier un numéro pour les tests (Sandbox)
Si vous êtes en mode Sandbox et voulez tester rapidement :

1. Allez sur [Console Twilio](https://console.twilio.com/)
2. **Phone Numbers** → **Manage** → **Verified Caller IDs**
3. Cliquez sur **"Add a new Caller ID"**
4. Entrez le numéro marocain au format : `+212612345678`
5. Twilio vous enverra un code de vérification par SMS
6. Entrez le code pour vérifier le numéro
7. Vous pourrez maintenant envoyer des SMS à ce numéro depuis votre application

### Solution 2 : Passer à un compte payant
Pour envoyer à n'importe quel numéro sans vérification :

1. Allez sur [Console Twilio](https://console.twilio.com/)
2. Cliquez sur votre nom en haut à droite
3. Sélectionnez **"Billing"**
4. Ajoutez une méthode de paiement
5. Une fois le compte activé, vous pourrez envoyer à n'importe quel numéro

### Solution 3 : Utiliser WhatsApp comme alternative
En attendant de résoudre le problème Twilio, l'application génère automatiquement une URL WhatsApp comme solution de secours.

## 📊 Logs de débogage

Le code a été amélioré pour capturer plus d'informations lors des erreurs. Les logs incluent maintenant :
- Le numéro original reçu
- Le numéro normalisé (format E.164)
- Le numéro Twilio utilisé (From)
- Le code d'erreur exact
- Le message d'erreur complet

## 🔗 Liens utiles

- [Documentation Twilio - Erreur 21612](https://www.twilio.com/docs/errors/21612)
- [Console Twilio](https://console.twilio.com/)
- [Guide de vérification des numéros (Sandbox)](https://www.twilio.com/docs/verify/quickstarts/trial-phone-number-verification)
- [Prix Twilio pour le Maroc](https://www.twilio.com/sms/pricing/ma)

## ⚠️ Important

**L'erreur 21612 est généralement liée à la configuration du compte Twilio, pas au code de l'application.**

Le code a été amélioré pour :
- ✅ Normaliser automatiquement les numéros au format E.164
- ✅ Fournir des messages d'erreur plus explicites
- ✅ Capturer plus d'informations dans les logs

Si le problème persiste après avoir vérifié votre compte Twilio, contactez le support Twilio avec le code d'erreur 21612.
