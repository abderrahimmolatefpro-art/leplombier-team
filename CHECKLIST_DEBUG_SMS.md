# Checklist : Vérification complète pour le problème SMS Infobip

## ✅ Vérifications à faire dans Vercel

### 1. Variables d'environnement
Vérifiez que ces 3 variables sont bien définies dans **Vercel → Settings → Environment Variables** :

- [ ] `INFOBIP_API_KEY` = `1049c8040442f487a2b32aad5d6379f5-ee9b5a81-b522-45c5-bfb1-10ac81b67efd`
- [ ] `INFOBIP_BASE_URL` = `m9mmd2.api.infobip.com` (sans https://)
- [ ] `INFOBIP_SENDER` = `GROUPE OGINCE` (optionnel, par défaut "CRM")

**Important :** Cochez les 3 environnements (Production, Preview, Development) pour chaque variable.

### 2. Redéploiement
- [ ] Après avoir ajouté/modifié les variables, **redéployez** l'application :
  - Vercel → Deployments → ⋯ → Redeploy

### 3. Vérification des logs
Après un test d'envoi SMS, vérifiez les logs dans Vercel :

1. Allez dans **Functions** → **`/api/client/send-sms`** → **Logs**
2. Cliquez sur la dernière invocation (votre test)
3. Dans **Function Logs**, cherchez avec Ctrl+F :

#### Logs à vérifier :

- [ ] **`infobipRequestBefore`** : Vérifiez que :
  - `apiUrl` = `https://m9mmd2.api.infobip.com/sms/2/text/advanced`
  - `hasApiKey` = `true`
  - `hasSender` = `true` ou `false` (peu importe)
  - `requestBody` contient bien `messages` avec `destinations`, `from`, `text`

- [ ] **`infobipFetchStart`** : Vérifiez que :
  - `apiUrl` est correct
  - `requestBody` est bien formaté
  - `requestHeaders` contient `Authorization: App ...`

- [ ] **`infobipFetchDone`** : Vérifiez que :
  - `status` = `200` (ou autre code)
  - `ok` = `true` ou `false`
  - `headers` sont présents

- [ ] **`infobipResponseText`** : Vérifiez que :
  - `responseText` contient une réponse JSON valide
  - Pas d'erreur de parsing

- [ ] **`infobipResponse`** : Vérifiez que :
  - `resultMessages` contient un tableau avec au moins un message
  - `messageCount` > 0
  - Pas de `resultRequestError`

- [ ] **`infobipMessageStatus`** : Vérifiez que :
  - `messageStatus` existe
  - `messageId` existe
  - Pas de `messageError`

### 4. Vérifications dans le code

#### Format du numéro de téléphone
Le numéro doit être au format **SANS le `+`** :
- ✅ `212612345678` (correct)
- ❌ `+212612345678` (incorrect pour Infobip)

#### Format de la requête
La requête doit être au format :
```json
{
  "messages": [
    {
      "destinations": [{"to": "212612345678"}],
      "from": "GROUPE OGINCE",
      "text": "Votre message"
    }
  ]
}
```

#### Headers
Les headers doivent être :
```
Authorization: App 1049c8040442f487a2b32aad5d6379f5-ee9b5a81-b522-45c5-bfb1-10ac81b67efd
Content-Type: application/json
Accept: application/json
```

### 5. Vérifications dans Infobip

1. Connectez-vous à [Console Infobip](https://portal.infobip.com/)
2. Vérifiez :
   - [ ] Votre crédit/solde est suffisant
   - [ ] Le numéro de téléphone de destination est valide
   - [ ] Les permissions géographiques pour le Maroc sont activées
   - [ ] Dans **Reports** → **SMS**, cherchez des tentatives d'envoi récentes

### 6. Tests à effectuer

1. **Test d'envoi SMS** :
   - [ ] Déclenchez un envoi (messages automatiques ou API `/api/client/send-sms`)
   - [ ] Utilisez un numéro : `0612345678` ou `212612345678`
   - [ ] Vérifiez la réponse (succès ou erreur dans les logs)

2. **Vérifiez les logs Vercel** après le test (voir section 3)

3. **Vérifiez le dashboard Infobip** pour voir si une tentative d'envoi apparaît

## 🔍 Problèmes courants et solutions

### Problème : Les logs ne montrent pas `infobipRequestBefore`
**Solution :** Le code n'atteint pas la section Infobip. Vérifiez que `INFOBIP_API_KEY` et `INFOBIP_BASE_URL` sont bien définis.

### Problème : `infobipFetchError` apparaît
**Solution :** L'appel à Infobip échoue. Vérifiez :
- L'URL est correcte (`https://m9mmd2.api.infobip.com/sms/2/text/advanced`)
- La clé API est correcte
- Le réseau Vercel peut accéder à Infobip

### Problème : `infobipResponseText` montre une erreur
**Solution :** Infobip retourne une erreur. Vérifiez :
- Le format du numéro (sans `+`)
- Le nom de l'expéditeur est valide
- Le compte Infobip a les permissions nécessaires

### Problème : `messageStatus` est `REJECTED` ou `UNDELIVERABLE`
**Solution :** Le message est rejeté par Infobip. Vérifiez :
- Le format du numéro
- Le nom de l'expéditeur
- Les permissions du compte Infobip

## 📝 Ce qu'il faut partager pour le débogage

Si le problème persiste, partagez :

1. **Les logs Vercel** :
   - `infobipRequestBefore` (requête complète)
   - `infobipResponseText` (réponse brute)
   - `infobipResponse` (réponse parsée)
   - `infobipMessageStatus` (statut du message)

2. **Les variables d'environnement** (sans les valeurs sensibles) :
   - `INFOBIP_BASE_URL` est défini : Oui/Non
   - `INFOBIP_API_KEY` est défini : Oui/Non
   - `INFOBIP_SENDER` est défini : Oui/Non

3. **Le résultat du test** :
   - Message d'erreur affiché (si erreur)
   - Code de statut HTTP (200, 400, 500, etc.)
