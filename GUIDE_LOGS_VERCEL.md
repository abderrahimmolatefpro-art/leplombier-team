# Guide : Comment trouver les logs Infobip dans Vercel

## 📋 Étapes pour accéder aux logs

### Étape 1 : Accéder à votre projet Vercel

1. Allez sur **https://vercel.com**
2. Connectez-vous avec votre compte
3. Cliquez sur votre projet **leplombier-team** (ou le nom de votre projet)

### Étape 2 : Accéder aux Functions

1. Dans le menu de gauche, cliquez sur **Functions**
2. Vous verrez une liste de toutes vos fonctions API

### Étape 3 : Trouver la fonction send-sms

1. Dans la liste des fonctions, cherchez **`/api/client/send-sms`**
2. Cliquez dessus

### Étape 4 : Accéder aux logs

1. Une fois dans la page de la fonction, vous verrez plusieurs onglets en haut :
   - **Overview** (Vue d'ensemble)
   - **Logs** ← **Cliquez ici**
   - **Settings** (Paramètres)

2. Cliquez sur l'onglet **Logs**

### Étape 5 : Filtrer les logs

Dans la page des logs, vous verrez :

1. **Une liste de toutes les invocations** de la fonction (les appels API)
2. **Un filtre de recherche** en haut pour chercher des mots-clés
3. **Chaque ligne** représente une invocation avec :
   - La date et l'heure
   - Le statut (200, 400, 500, etc.)
   - La durée d'exécution

### Étape 6 : Ouvrir une invocation spécifique

1. **Cliquez sur une invocation** (une ligne dans la liste)
   - Choisissez la plus récente (celle où vous avez testé l'envoi SMS)
   - Elle devrait avoir le statut **200** et la date/heure de votre test

2. Une fois ouverte, vous verrez :
   - **Request** : Les détails de la requête reçue
   - **Response** : La réponse envoyée
   - **Function Logs** : **C'est ici que se trouvent nos logs !** ← **Important**

### Étape 7 : Chercher les logs spécifiques

Dans la section **Function Logs**, vous verrez toutes les lignes de logs. Cherchez ces mots-clés :

#### 🔍 Logs à chercher :

1. **`infobipRequestBefore`**
   - Cherchez cette ligne dans les logs
   - Elle contient : `location:'send-sms/route.ts:infobipRequestBefore'`
   - Cette ligne montre la requête complète avant l'appel à Infobip

2. **`infobipFetchDone`**
   - Cherchez cette ligne
   - Elle contient : `location:'send-sms/route.ts:infobipFetchDone'`
   - Cette ligne montre la réponse HTTP d'Infobip

3. **`infobipResponseText`**
   - Cherchez cette ligne
   - Elle contient : `location:'send-sms/route.ts:infobipResponseText'`
   - Cette ligne montre le texte brut de la réponse

4. **`infobipResponse`**
   - Cherchez cette ligne
   - Elle contient : `location:'send-sms/route.ts:infobipResponse'`
   - Cette ligne montre la réponse parsée (JSON)

### Étape 8 : Utiliser la recherche

Pour trouver rapidement ces logs :

1. Dans la section **Function Logs**, utilisez **Ctrl+F** (ou **Cmd+F** sur Mac)
2. Tapez : `infobipRequestBefore`
3. Appuyez sur **Entrée** pour trouver la première occurrence
4. Utilisez les flèches pour naviguer entre les occurrences

Répétez pour chaque log :
- `infobipFetchDone`
- `infobipResponseText`
- `infobipResponse`

## 📊 Exemple de ce que vous devriez voir

### Log `infobipRequestBefore` :
```json
{
  "location": "send-sms/route.ts:infobipRequestBefore",
  "message": "About to call Infobip API",
  "data": {
    "apiUrl": "https://m9mmd2.api.infobip.com/sms/2/text/advanced",
    "baseUrl": "m9mmd2.api.infobip.com",
    "requestBody": {
      "messages": [{
        "destinations": [{"to": "+212612345678"}],
        "from": "CRM",
        "text": "Votre message de test"
      }]
    },
    "hasApiKey": true,
    "apiKeyPrefix": "1049c80404...",
    "hasSender": true,
    "sender": "CRM"
  }
}
```

### Log `infobipResponseText` :
```json
{
  "location": "send-sms/route.ts:infobipResponseText",
  "message": "Infobip response text received",
  "data": {
    "responseText": "{\"messages\":[{\"messageId\":\"abc123\",\"status\":{\"groupId\":1,\"groupName\":\"PENDING\",\"id\":7,\"name\":\"PENDING\"}}]}",
    "responseTextLength": 150
  }
}
```

## 🎯 Résumé visuel du chemin

```
Vercel Dashboard
  └─> Votre Projet
      └─> Functions (menu de gauche)
          └─> /api/client/send-sms
              └─> Logs (onglet)
                  └─> Cliquez sur une invocation (ligne)
                      └─> Function Logs (section)
                          └─> Cherchez avec Ctrl+F :
                              - infobipRequestBefore
                              - infobipFetchDone
                              - infobipResponseText
                              - infobipResponse
```

## ⚠️ Si vous ne voyez pas les logs

### Problème 1 : Les logs ne s'affichent pas
- **Solution** : Attendez quelques secondes, les logs peuvent prendre du temps à apparaître
- **Solution** : Rafraîchissez la page (F5)

### Problème 2 : Vous ne trouvez pas la fonction
- **Solution** : Assurez-vous d'avoir redéployé après les dernières modifications
- **Solution** : Vérifiez que vous êtes dans le bon projet Vercel

### Problème 3 : Les logs sont vides
- **Solution** : Testez à nouveau l'envoi d'un SMS depuis `/test-messages`
- **Solution** : Vérifiez que la fonction a bien été appelée (regardez la liste des invocations)

### Problème 4 : Vous ne voyez pas les logs détaillés
- **Solution** : Assurez-vous que la dernière version du code est déployée (avec les nouveaux logs)
- **Solution** : Redéployez manuellement si nécessaire

## 🔗 Alternative : Logs en temps réel

Si vous voulez voir les logs en temps réel pendant le test :

1. Allez dans **Functions** → **`/api/client/send-sms`** → **Logs**
2. **Gardez cette page ouverte**
3. Dans un autre onglet, testez l'envoi d'un SMS
4. Revenez à l'onglet Vercel
5. Les nouveaux logs devraient apparaître automatiquement

## 📝 Ce qu'il faut partager

Une fois que vous avez trouvé les logs, partagez-moi :

1. **Le log `infobipRequestBefore`** (la requête complète)
2. **Le log `infobipResponseText`** (la réponse brute d'Infobip)
3. **Le log `infobipResponse`** (la réponse parsée)

Cela me permettra de voir exactement ce qui est envoyé à Infobip et ce qui est retourné, et d'identifier pourquoi le SMS n'est pas envoyé.
