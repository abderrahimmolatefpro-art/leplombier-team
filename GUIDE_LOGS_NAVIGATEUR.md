# Guide : Utiliser les logs dans la console du navigateur

## 🎯 Comment accéder à la console

### Chrome / Edge / Brave
1. Ouvrez votre application : `https://dash.leplombier.ma/test-messages`
2. Appuyez sur **F12** (ou **Cmd+Option+I** sur Mac)
3. Cliquez sur l'onglet **Console**

### Firefox
1. Ouvrez votre application
2. Appuyez sur **F12** (ou **Cmd+Option+I** sur Mac)
3. Cliquez sur l'onglet **Console**

### Safari
1. Ouvrez votre application
2. **Cmd+Option+C** pour ouvrir la console
3. Ou : Menu **Développement** → **Afficher la console JavaScript**

## 📱 Tester l'envoi SMS

1. Allez sur `/test-messages`
2. **Ouvrez la console** (F12)
3. Entrez un numéro de téléphone (ex: `0612345678`)
4. Entrez un message de test
5. Cliquez sur **"Tester l'envoi SMS"**
6. **Regardez la console** - tous les logs apparaîtront en temps réel

## 📊 Logs que vous verrez

### Côté Client (Navigateur)

#### 1. Début de l'envoi
```
📱 [TEST SMS] Début de l'envoi SMS
📱 [TEST SMS] Données: { phone: "0612345678", messageLength: 20 }
📱 [TEST SMS] Envoi de la requête à /api/client/send-sms
📱 [TEST SMS] Body: { phone: "0612345678", message: "Votre message" }
```

#### 2. Réponse reçue
```
📱 [TEST SMS] Réponse reçue: { status: 200, statusText: "OK", ok: true }
📱 [TEST SMS] Données de la réponse: { success: true, messageId: "abc123", ... }
```

#### 3. Succès ou Erreur
```
✅ [TEST SMS] Succès! Message ID: abc123
✅ [TEST SMS] Statut: PENDING
✅ [TEST SMS] Détails: { to: "212612345678", status: {...} }
```

OU

```
❌ [TEST SMS] Erreur: "SMS rejeté par Infobip: REJECTED"
❌ [TEST SMS] Détails: { ... }
```

### Côté Serveur (Vercel Logs)

Les logs serveur apparaissent dans **Vercel → Functions → `/api/client/send-sms` → Logs**, mais vous pouvez aussi les voir dans la console du navigateur si vous regardez l'onglet **Network** :

1. Ouvrez la console (F12)
2. Allez dans l'onglet **Network**
3. Filtrez par **XHR** ou **Fetch**
4. Cliquez sur la requête `/api/client/send-sms`
5. Allez dans l'onglet **Response** pour voir la réponse complète

## 🔍 Ce qu'il faut vérifier dans les logs

### 1. Variables d'environnement
Cherchez dans les logs serveur (Vercel) :
```
🚀 [SMS API] Variables d'environnement: {
  hasInfobipApiKey: true,  ← Doit être true
  hasInfobipBaseUrl: true, ← Doit être true
  baseUrl: "m9mmd2.api.infobip.com",
  sender: "GROUPE OGINCE"
}
```

**Si `hasInfobipApiKey` ou `hasInfobipBaseUrl` est `false`** :
- Les variables ne sont pas configurées dans Vercel
- Redéployez après avoir ajouté les variables

### 2. Numéro normalisé
```
📞 [SMS API] Numéro normalisé: {
  original: "0612345678",
  normalized: "212612345678"  ← Doit être sans le +
}
```

**Vérifiez que** :
- Le numéro normalisé commence par `212` (pas `+212`)
- Le numéro a 12 chiffres (212 + 9 chiffres)

### 3. Requête Infobip
```
📤 [SMS API] Requête Infobip: {
  url: "https://m9mmd2.api.infobip.com/sms/2/text/advanced",
  method: "POST",
  body: {
    messages: [{
      destinations: [{ to: "212612345678" }],
      from: "GROUPE OGINCE",
      text: "Votre message"
    }]
  }
}
```

**Vérifiez que** :
- L'URL est correcte (`https://m9mmd2.api.infobip.com/sms/2/text/advanced`)
- Le numéro dans `destinations[0].to` est sans `+`
- Le `from` est défini

### 4. Réponse HTTP
```
📥 [SMS API] Réponse HTTP Infobip: {
  status: 200,  ← Doit être 200
  statusText: "OK",
  ok: true
}
```

**Si `status` n'est pas 200** :
- Vérifiez la clé API
- Vérifiez l'URL de base
- Vérifiez les permissions du compte Infobip

### 5. Réponse texte
```
📄 [SMS API] Réponse texte Infobip: {
  length: 150,
  preview: "{\"messages\":[{\"messageId\":\"abc123\",...",
  full: "{ ... }"
}
```

**Copiez le `full`** et vérifiez :
- S'il y a un `requestError` → Erreur Infobip
- S'il y a un `messages` array → Succès
- Le statut dans `messages[0].status`

### 6. Statut du message
```
📊 [SMS API] Statut du message Infobip: {
  messageStatus: "PENDING",  ← Doit être PENDING, SENT, ou DELIVERED
  messageId: "abc123",
  messageError: null,  ← Doit être null
  fullMessage: { ... }
}
```

**Statuts possibles** :
- `PENDING` ✅ (normal, en attente)
- `SENT` ✅ (envoyé)
- `DELIVERED` ✅ (livré)
- `REJECTED` ❌ (rejeté - erreur)
- `UNDELIVERABLE` ❌ (non livrable - erreur)
- `EXPIRED` ❌ (expiré - erreur)
- `CANCELED` ❌ (annulé - erreur)

## 🚨 Problèmes courants et solutions

### Problème : `hasInfobipApiKey: false`
**Solution** : Ajoutez `INFOBIP_API_KEY` dans Vercel → Settings → Environment Variables

### Problème : `hasInfobipBaseUrl: false`
**Solution** : Ajoutez `INFOBIP_BASE_URL` dans Vercel → Settings → Environment Variables

### Problème : `status: 401` (Unauthorized)
**Solution** : La clé API est incorrecte. Vérifiez `INFOBIP_API_KEY` dans Vercel

### Problème : `status: 400` (Bad Request)
**Solution** : Vérifiez :
- Le format du numéro (sans `+`)
- Le nom de l'expéditeur (`INFOBIP_SENDER`)
- Le format de la requête

### Problème : `messageStatus: "REJECTED"`
**Solution** : Le message est rejeté par Infobip. Vérifiez :
- Le format du numéro
- Les permissions du compte Infobip
- Le crédit Infobip

### Problème : Pas de logs dans la console
**Solution** :
1. Vérifiez que la console est ouverte (F12)
2. Vérifiez que les filtres de la console ne masquent pas les logs
3. Rafraîchissez la page et réessayez

## 📝 Ce qu'il faut partager pour le débogage

Si le problème persiste, partagez-moi :

1. **Les logs de la console du navigateur** (copiez-collez tout)
2. **La réponse complète** de l'API (onglet Network → Response)
3. **Les variables d'environnement** (sans les valeurs sensibles) :
   - `hasInfobipApiKey`: true/false
   - `hasInfobipBaseUrl`: true/false
   - `baseUrl`: "m9mmd2.api.infobip.com"

## 💡 Astuce

**Filtrez les logs** dans la console :
- Tapez `[SMS API]` ou `[TEST SMS]` dans le filtre de la console
- Vous verrez uniquement les logs SMS

## 🎯 Résumé

1. Ouvrez la console (F12)
2. Testez l'envoi SMS
3. Regardez les logs qui commencent par `📱`, `🚀`, `📞`, `🌐`, `📤`, `📥`, `📄`, `📊`, `✅`, `❌`
4. Copiez les logs et partagez-les si besoin

Les logs vous diront exactement où le problème se situe !
