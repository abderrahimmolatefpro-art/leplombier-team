# Dépannage : SMS Infobip envoyé mais non reçu

## 🔴 Problème
L'API retourne **200 OK** mais le SMS n'arrive pas sur le téléphone.

## 📋 Causes possibles

### 1. **Statut du message rejeté par Infobip** (Cause la plus fréquente)
Même si l'API HTTP retourne 200, Infobip peut rejeter le message dans le body de la réponse avec un statut comme :
- `REJECTED` : Message rejeté
- `UNDELIVERABLE` : Message non livrable
- `EXPIRED` : Message expiré
- `CANCELED` : Message annulé

**Solution :**
- Vérifiez les logs dans Vercel (Functions → `/api/client/send-sms` → Logs)
- Cherchez le champ `messageStatus` dans les logs
- Si le statut est `REJECTED` ou `UNDELIVERABLE`, vérifiez :
  - Le format du numéro de téléphone (doit être E.164 : +212...)
  - Le nom de l'expéditeur (INFOBIP_SENDER) est-il valide ?
  - Le compte Infobip a-t-il les permissions pour envoyer vers ce pays ?

### 2. **Format du numéro de téléphone incorrect**
Le numéro n'est peut-être pas dans le bon format.

**Vérification :**
- Le numéro doit être au format E.164 : `+212612345678`
- Formats acceptés par l'application :
  - `+212612345678` ✅
  - `00212612345678` ✅ (converti automatiquement)
  - `0612345678` ✅ (converti automatiquement en +212612345678)
  - `612345678` ✅ (converti automatiquement en +212612345678)

**Solution :**
- Vérifiez dans les logs le champ `toNormalized` pour voir le numéro final envoyé à Infobip
- Assurez-vous qu'il commence par `+212`

### 3. **Nom de l'expéditeur (INFOBIP_SENDER) invalide**
Le nom de l'expéditeur peut être rejeté par Infobip ou l'opérateur.

**Solution :**
- Vérifiez que `INFOBIP_SENDER` est configuré dans Vercel
- Essayez avec un nom simple comme `CRM` ou `OGINCE`
- Certains opérateurs rejettent les noms trop longs ou avec caractères spéciaux

### 4. **Problème de compte Infobip**
Le compte Infobip peut avoir des limitations.

**Vérifications :**
1. Connectez-vous à votre [Console Infobip](https://portal.infobip.com/)
2. Vérifiez votre crédit/solde
3. Vérifiez les logs d'envoi dans le dashboard Infobip
4. Vérifiez les permissions géographiques (le Maroc doit être autorisé)

### 5. **Blocage par l'opérateur téléphonique**
L'opérateur du destinataire peut bloquer le SMS.

**Solution :**
- Testez avec un autre numéro de téléphone
- Vérifiez si le téléphone reçoit d'autres SMS
- Contactez l'opérateur si nécessaire

### 6. **Délai de livraison**
Les SMS peuvent prendre quelques minutes à arriver.

**Solution :**
- Attendez 5-10 minutes
- Vérifiez les logs Infobip pour voir le statut de livraison

## 🔍 Comment déboguer

### Étape 1 : Vérifier les logs Vercel
1. Allez sur Vercel → Votre projet → **Functions**
2. Cliquez sur `/api/client/send-sms`
3. Allez dans l'onglet **Logs**
4. Cherchez les entrées avec `infobipResponse` et `infobipMessageStatus`
5. Vérifiez :
   - `messageStatus` : doit être `PENDING`, `SENT`, ou `DELIVERED` (pas `REJECTED`)
   - `messageError` : doit être `null` ou `undefined`
   - `toNormalized` : doit être au format `+212...`

### Étape 2 : Vérifier la réponse complète
Dans les logs, cherchez `resultFull` pour voir la réponse complète d'Infobip :

```json
{
  "messages": [
    {
      "to": "+212612345678",
      "status": {
        "groupId": 1,
        "groupName": "PENDING",
        "id": 7,
        "name": "PENDING",
        "description": "Message is pending"
      },
      "messageId": "abc123"
    }
  ]
}
```

**Statuts possibles :**
- `PENDING` : Message en attente (normal)
- `SENT` : Message envoyé (normal)
- `DELIVERED` : Message livré (succès)
- `REJECTED` : Message rejeté (erreur)
- `UNDELIVERABLE` : Message non livrable (erreur)
- `EXPIRED` : Message expiré (erreur)

### Étape 3 : Vérifier le dashboard Infobip
1. Connectez-vous à [Console Infobip](https://portal.infobip.com/)
2. Allez dans **Reports** → **SMS**
3. Cherchez votre message par `messageId` (visible dans les logs)
4. Vérifiez le statut de livraison

## 🚀 Solutions rapides

### Solution 1 : Vérifier le format du numéro
Testez avec un numéro au format exact : `+212612345678`

### Solution 2 : Simplifier le nom de l'expéditeur
Changez `INFOBIP_SENDER` dans Vercel à `CRM` (nom simple)

### Solution 3 : Vérifier le compte Infobip
- Vérifiez le crédit
- Vérifiez les permissions géographiques
- Vérifiez les logs dans le dashboard Infobip

### Solution 4 : Tester avec un autre numéro
Testez avec un autre numéro de téléphone pour isoler le problème

## 📊 Logs améliorés

Le code a été amélioré pour capturer :
- ✅ La réponse complète d'Infobip (`resultFull`)
- ✅ Le statut du message (`messageStatus`)
- ✅ Les erreurs éventuelles (`messageError`)
- ✅ Le numéro normalisé (`toNormalized`)
- ✅ Le message complet (`fullMessage`)

Tous ces détails sont maintenant dans les logs Vercel pour faciliter le débogage.

## ⚠️ Important

**Un HTTP 200 ne garantit pas que le SMS a été envoyé avec succès.**

Infobip peut retourner 200 OK mais avec un statut d'erreur dans le body de la réponse. Le code vérifie maintenant ces statuts et retourne une erreur appropriée si le message est rejeté.

## 🔗 Liens utiles

- [Console Infobip](https://portal.infobip.com/)
- [Documentation Infobip SMS API](https://www.infobip.com/docs/api/channels/sms/sms-messaging/outbound-sms/send-sms-message)
- [Support Infobip](https://www.infobip.com/support)
