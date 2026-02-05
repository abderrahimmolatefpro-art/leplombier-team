# Configuration Email avec Infobip

## 📧 Vue d'ensemble

L'application utilise **Infobip Email API** en priorité pour l'envoi d'emails, avec un fallback automatique vers **SMTP** si Infobip n'est pas configuré ou en cas d'erreur.

## 🔑 Variables d'environnement requises

### Pour Infobip (recommandé)

Les mêmes variables que pour les SMS sont utilisées :

- `INFOBIP_API_KEY` : Votre clé API Infobip
  - Exemple : `1049c8040442f487a2b32aad5d6379f5-ee9b5a81-b522-45c5-bfb1-10ac81b67efd`
  
- `INFOBIP_BASE_URL` : L'URL de base de votre API Infobip
  - Exemple : `m9mmd2.api.infobip.com` (sans `https://`)
  
- `INFOBIP_EMAIL_FROM` (optionnel) : L'adresse email d'expéditeur
  - Exemple : `noreply@leplombier.ma`
  - Si non défini, utilise `INFOBIP_SENDER` ou `noreply@leplombier.ma` par défaut

### Pour SMTP (fallback)

Si Infobip n'est pas configuré, l'application utilisera SMTP :

- `SMTP_HOST` : Serveur SMTP
  - Exemple : `smtp.gmail.com`
  
- `SMTP_PORT` : Port SMTP
  - Exemple : `587` (TLS) ou `465` (SSL)
  
- `SMTP_SECURE` : Utiliser SSL/TLS
  - `true` pour le port 465, `false` pour le port 587
  
- `SMTP_USER` : Nom d'utilisateur SMTP
  - Exemple : `votre-email@gmail.com`
  
- `SMTP_PASS` : Mot de passe SMTP
  - Pour Gmail : mot de passe d'application (16 caractères)
  
- `SMTP_FROM` : Adresse email d'expéditeur
  - Exemple : `votre-email@gmail.com`
  - Si non défini, utilise `SMTP_USER`

## 📋 Configuration dans Vercel

### Étape 1 : Ajouter les variables d'environnement

1. Allez sur **Vercel** → Votre projet → **Settings** → **Environment Variables**
2. Ajoutez les variables suivantes :

#### Variables Infobip (pour Email)

| Variable | Valeur | Environnements |
|----------|--------|----------------|
| `INFOBIP_API_KEY` | `1049c8040442f487a2b32aad5d6379f5-ee9b5a81-b522-45c5-bfb1-10ac81b67efd` | ✅ Production, ✅ Preview, ✅ Development |
| `INFOBIP_BASE_URL` | `m9mmd2.api.infobip.com` | ✅ Production, ✅ Preview, ✅ Development |
| `INFOBIP_EMAIL_FROM` | `noreply@leplombier.ma` (optionnel) | ✅ Production, ✅ Preview, ✅ Development |

**Important** : Cochez les **3 environnements** (Production, Preview, Development) pour chaque variable.

#### Variables SMTP (fallback, optionnel)

Si vous voulez un fallback SMTP :

| Variable | Valeur | Environnements |
|----------|--------|----------------|
| `SMTP_HOST` | `smtp.gmail.com` | ✅ Production, ✅ Preview, ✅ Development |
| `SMTP_PORT` | `587` | ✅ Production, ✅ Preview, ✅ Development |
| `SMTP_SECURE` | `false` | ✅ Production, ✅ Preview, ✅ Development |
| `SMTP_USER` | `votre-email@gmail.com` | ✅ Production, ✅ Preview, ✅ Development |
| `SMTP_PASS` | `votre-mot-de-passe-app` | ✅ Production, ✅ Preview, ✅ Development |
| `SMTP_FROM` | `votre-email@gmail.com` | ✅ Production, ✅ Preview, ✅ Development |

### Étape 2 : Redéployer

**CRITIQUE** : Après avoir ajouté/modifié des variables d'environnement, vous **DEVEZ** redéployer :

1. Allez dans **Deployments**
2. Cliquez sur les **3 points** (⋯) à droite du dernier déploiement
3. Cliquez sur **"Redeploy"**
4. Attendez la fin du build

## 🧪 Tester l'envoi d'emails

### Via l'interface de test

1. Allez sur `https://dash.leplombier.ma/test-messages`
2. Remplissez le formulaire "Test Email" :
   - **Destinataire** : Votre adresse email
   - **Sujet** : Test Email
   - **Message** : Message de test
3. Cliquez sur **"Tester l'envoi Email"**
4. Vérifiez la console du navigateur (F12) pour les logs

### Vérifier les logs

#### Logs navigateur (console F12)

Vous devriez voir :
```
📤 [EMAIL] Envoi via Infobip: { to: "...", subject: "...", from: "..." }
✅ [EMAIL] Email envoyé avec succès via Infobip.
```

Ou en cas de fallback SMTP :
```
⚠️ [EMAIL] Fallback vers SMTP...
✅ [EMAIL] Email envoyé avec succès via SMTP.
```

#### Logs Vercel (serveur)

1. Allez sur **Vercel** → Votre projet → **Functions**
2. Cliquez sur **`/api/client/send-email`**
3. Allez dans l'onglet **Logs**
4. Cliquez sur la **dernière invocation**
5. Cherchez les logs `📤 [EMAIL]` et `✅ [EMAIL]`

## 🔄 Ordre de priorité

L'application essaie d'envoyer les emails dans cet ordre :

1. **Infobip Email API** (si `INFOBIP_API_KEY` et `INFOBIP_BASE_URL` sont configurés)
   - En cas d'erreur, fallback automatique vers SMTP
   
2. **SMTP** (si `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` sont configurés)
   - Utilisé si Infobip n'est pas configuré ou en cas d'erreur Infobip

3. **Erreur** (si aucune méthode n'est configurée)
   - Retourne une erreur avec les détails de configuration manquante

## 🚨 Dépannage

### Problème : Email non reçu

1. **Vérifiez les logs Vercel** pour voir si l'email a été envoyé
2. **Vérifiez le dossier spam** de votre boîte mail
3. **Vérifiez les logs** pour identifier la méthode utilisée (Infobip ou SMTP)
4. **Vérifiez les variables d'environnement** dans Vercel

### Problème : "Aucune méthode d'envoi configurée"

**Cause** : Aucune variable d'environnement configurée

**Solution** :
1. Ajoutez les variables Infobip (`INFOBIP_API_KEY`, `INFOBIP_BASE_URL`) **OU** les variables SMTP
2. Cochez les **3 environnements** (Production, Preview, Development)
3. **Redéployez** l'application

### Problème : Erreur Infobip

**Cause** : Problème avec l'API Infobip (clé invalide, quota dépassé, etc.)

**Solution** :
1. Vérifiez que `INFOBIP_API_KEY` est correcte
2. Vérifiez que `INFOBIP_BASE_URL` est correcte (sans `https://`)
3. Vérifiez votre compte Infobip pour les quotas/limites
4. L'application basculera automatiquement vers SMTP si configuré

### Problème : Erreur SMTP

**Cause** : Problème avec la configuration SMTP

**Solution** :
1. Vérifiez que `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` sont corrects
2. Pour Gmail, utilisez un **mot de passe d'application** (pas votre mot de passe normal)
3. Vérifiez que `SMTP_PORT` et `SMTP_SECURE` correspondent (587 = false, 465 = true)

## 📝 Notes importantes

- **Infobip est prioritaire** : Si Infobip est configuré, il sera utilisé en premier
- **Fallback automatique** : En cas d'erreur Infobip, SMTP sera utilisé automatiquement si configuré
- **Redéploiement requis** : Les variables d'environnement ne sont prises en compte qu'après un redéploiement
- **Même API Key** : Infobip utilise la même clé API pour SMS et Email

## ✅ Checklist

- [ ] Variables `INFOBIP_API_KEY` et `INFOBIP_BASE_URL` ajoutées dans Vercel
- [ ] Les 3 environnements sont cochés (Production, Preview, Development)
- [ ] Variable `INFOBIP_EMAIL_FROM` ajoutée (optionnel)
- [ ] Variables SMTP ajoutées (optionnel, pour fallback)
- [ ] **Redéploiement effectué** après avoir ajouté les variables
- [ ] Test d'envoi effectué via `/test-messages`
- [ ] Email reçu dans la boîte de réception (vérifier aussi le spam)
