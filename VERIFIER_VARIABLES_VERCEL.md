# Guide : Vérifier pourquoi les variables Infobip ne sont pas détectées

## 🔍 Problème

Les variables `INFOBIP_API_KEY` et `INFOBIP_BASE_URL` sont configurées dans Vercel, mais le code ne les détecte pas et utilise le fallback WhatsApp.

## 📋 Vérifications à faire

### 1. Vérifier les logs serveur dans Vercel

Les logs `console.log` côté serveur n'apparaissent **PAS** dans la console du navigateur. Ils sont dans **Vercel**.

**Étapes :**
1. Allez sur **Vercel** → Votre projet → **Functions**
2. Cliquez sur **`/api/client/send-sms`**
3. Allez dans l'onglet **Logs**
4. Cliquez sur la **dernière invocation** (votre test)
5. Dans **Function Logs**, cherchez avec Ctrl+F : `🔍 [SMS API] Vérification configuration Infobip`

**Ce que vous devriez voir :**
```
🔍 [SMS API] Vérification configuration Infobip: {
  INFOBIP_API_KEY: "1049c80404... (XX caractères)" OU "❌ MANQUANT",
  INFOBIP_BASE_URL: "m9mmd2.api.infobip.com" OU "❌ MANQUANT",
  hasApiKey: true/false,
  hasBaseUrl: true/false,
  conditionMet: true/false,
  allEnvVars: ["INFOBIP_API_KEY", "INFOBIP_BASE_URL", ...] OU [],
  nodeEnv: "production",
  vercelEnv: "production"
}
```

### 2. Vérifier les variables dans Vercel

1. Allez sur **Vercel** → Votre projet → **Settings** → **Environment Variables**
2. Vérifiez que ces variables existent **exactement** avec ces noms (sensible à la casse) :
   - `INFOBIP_API_KEY` (pas `infobip_api_key` ou `Infobip_Api_Key`)
   - `INFOBIP_BASE_URL` (pas `infobip_base_url` ou `Infobip_Base_Url`)

3. **IMPORTANT** : Vérifiez que les **3 environnements** sont cochés pour chaque variable :
   - ✅ **Production**
   - ✅ **Preview**
   - ✅ **Development**

4. Vérifiez les valeurs :
   - `INFOBIP_API_KEY` = `1049c8040442f487a2b32aad5d6379f5-ee9b5a81-b522-45c5-bfb1-10ac81b67efd`
   - `INFOBIP_BASE_URL` = `m9mmd2.api.infobip.com` (sans `https://`)

### 3. Vérifier l'environnement de déploiement

Dans les logs Vercel, vérifiez :
- `nodeEnv: "production"` → Les variables doivent être configurées pour **Production**
- `vercelEnv: "production"` → Confirme que vous êtes en production

### 4. Redéployer après modification

**CRITIQUE** : Après avoir ajouté/modifié des variables d'environnement dans Vercel, vous **DEVEZ** redéployer :

1. Allez dans **Deployments**
2. Cliquez sur les **3 points** (⋯) à droite du dernier déploiement
3. Cliquez sur **"Redeploy"**
4. Attendez la fin du build

**Les variables ne sont prises en compte qu'après un redéploiement !**

### 5. Vérifier le champ `debug` dans la réponse

Dans la console du navigateur, développez l'objet `debug` dans la réponse :

```javascript
📱 [TEST SMS] Données de la réponse: {
  success: true,
  message: "URL WhatsApp générée",
  debug: {
    hasInfobipApiKey: false,  ← Doit être true
    hasInfobipBaseUrl: false, ← Doit être true
    missingVars: ["INFOBIP_API_KEY", "INFOBIP_BASE_URL"]  ← Liste des variables manquantes
  }
}
```

## 🚨 Problèmes courants

### Problème 1 : Variables configurées mais pas pour Production
**Symptôme** : `hasInfobipApiKey: false` dans les logs
**Solution** : Cochez **Production** dans les environnements de chaque variable

### Problème 2 : Variables ajoutées mais pas redéployé
**Symptôme** : Variables visibles dans Vercel mais pas détectées par le code
**Solution** : **Redéployez** après avoir ajouté les variables

### Problème 3 : Faute de frappe dans le nom
**Symptôme** : Variables configurées mais `allEnvVars: []` dans les logs
**Solution** : Vérifiez l'orthographe exacte : `INFOBIP_API_KEY` et `INFOBIP_BASE_URL` (tout en majuscules)

### Problème 4 : Espaces dans les valeurs
**Symptôme** : Variables détectées mais erreur lors de l'appel
**Solution** : Vérifiez qu'il n'y a pas d'espaces avant/après les valeurs dans Vercel

## 📝 Ce qu'il faut partager

Si le problème persiste, partagez-moi :

1. **Les logs Vercel** (Function Logs) avec `🔍 [SMS API] Vérification configuration Infobip`
2. **Le champ `debug`** de la réponse (développez l'objet dans la console)
3. **Une capture d'écran** de vos variables d'environnement dans Vercel (masquez les valeurs sensibles)

## ✅ Checklist

- [ ] Variables `INFOBIP_API_KEY` et `INFOBIP_BASE_URL` existent dans Vercel
- [ ] Les 3 environnements sont cochés (Production, Preview, Development)
- [ ] Les noms sont exacts (tout en majuscules, pas d'espaces)
- [ ] Les valeurs sont correctes (pas d'espaces avant/après)
- [ ] **Redéploiement effectué** après avoir ajouté/modifié les variables
- [ ] Logs Vercel vérifiés pour voir si les variables sont détectées
