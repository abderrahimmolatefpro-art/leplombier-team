# Guide : Redéployer l'application sur Vercel

## 📋 Étapes pour redéployer après avoir ajouté des variables d'environnement

### Étape 1 : Accéder à votre projet Vercel

1. Allez sur **https://vercel.com**
2. Connectez-vous avec votre compte (GitHub, GitLab, ou email)
3. Dans la liste de vos projets, cliquez sur **leplombier-team** (ou le nom de votre projet)

### Étape 2 : Ajouter les variables d'environnement (si pas encore fait)

1. Dans le menu de gauche, cliquez sur **Settings**
2. Cliquez sur **Environment Variables** dans le sous-menu
3. Vous verrez une liste de variables existantes (ou une liste vide)

4. **Ajoutez les 3 variables Twilio une par une :**

   **Variable 1 :**
   - Cliquez sur le bouton **"Add New"** ou **"Add"**
   - Dans le champ **Key** (ou Name), tapez : `TWILIO_ACCOUNT_SID`
   - Dans le champ **Value**, tapez : `votre-account-sid-ici` (commence par AC...)
   - Cochez les 3 environnements : **Production**, **Preview**, **Development**
   - Cliquez sur **Save**

   **Variable 2 :**
   - Cliquez à nouveau sur **"Add New"**
   - **Key** : `TWILIO_AUTH_TOKEN`
   - **Value** : `votre-auth-token-ici`
   - Cochez les 3 environnements
   - Cliquez sur **Save**

   **Variable 3 :**
   - Cliquez sur **"Add New"**
   - **Key** : `TWILIO_PHONE_NUMBER`
   - **Value** : `+votre-numero-twilio` (format international avec +)
   - Cochez les 3 environnements
   - Cliquez sur **Save**

### Étape 3 : Redéployer l'application

**Méthode 1 : Via l'interface Vercel (Recommandé)**

1. Dans le menu de gauche, cliquez sur **Deployments**
2. Vous verrez une liste de tous vos déploiements (le plus récent en haut)
3. Trouvez le dernier déploiement (celui avec la date la plus récente)
4. À droite de ce déploiement, vous verrez **3 points horizontaux** (⋯) ou un menu **"..."**
5. Cliquez sur ces 3 points
6. Dans le menu déroulant, cliquez sur **"Redeploy"** ou **"Redéployer"**
7. Une fenêtre de confirmation apparaît
8. Cliquez sur **"Redeploy"** pour confirmer
9. Attendez que le déploiement se termine (vous verrez un indicateur de progression)

**Méthode 2 : Via un nouveau commit (Alternative)**

Si vous préférez, vous pouvez simplement faire un petit changement et pousser :

```bash
# Faire un petit changement (ex: ajouter un commentaire)
git commit --allow-empty -m "Trigger redeploy for environment variables"
git push
```

Vercel redéploiera automatiquement.

### Étape 4 : Vérifier le déploiement

1. Une fois le redéploiement terminé, vous verrez un statut **"Ready"** ou **"✓"** vert
2. Cliquez sur le déploiement pour voir les détails
3. Vérifiez qu'il n'y a pas d'erreurs dans les logs

### Étape 5 : Tester

1. Allez sur votre site : `https://dash.leplombier.ma`
2. Testez l'envoi d'un SMS (via les messages automatiques ou l'API)
3. Vérifiez que ça fonctionne maintenant

## 🎯 Résumé visuel des étapes

```
Vercel Dashboard
  └─> Votre Projet (leplombier-team)
      ├─> Settings
      │   └─> Environment Variables
      │       └─> Add New (3 fois pour les 3 variables Twilio)
      │
      └─> Deployments
          └─> Dernier déploiement
              └─> ⋯ (3 points)
                  └─> Redeploy
                      └─> Confirmer
```

## ⚠️ Points importants

1. **Les variables doivent être ajoutées AVANT de redéployer** pour être prises en compte
2. **Cochez les 3 environnements** (Production, Preview, Development) pour que ça fonctionne partout
3. **Attendez la fin du redéploiement** avant de tester (peut prendre 1-3 minutes)
4. **Les variables sont sensibles** : ne les partagez jamais publiquement

## 🔍 Vérification que les variables sont bien prises en compte

Après le redéploiement, vous pouvez vérifier dans les logs :

1. Allez dans **Deployments** → Cliquez sur le dernier déploiement
2. Allez dans l'onglet **Functions**
3. Cliquez sur `/api/client/send-sms`
4. Regardez les logs lors d'un test

Si vous voyez des erreurs comme "TWILIO_ACCOUNT_SID is not defined", c'est que les variables ne sont pas bien configurées.

## ❓ Problèmes courants

### "Redeploy" n'apparaît pas dans le menu
- Assurez-vous d'être sur la page **Deployments**
- Cliquez bien sur les 3 points (⋯) à droite du déploiement
- Si vous ne voyez pas l'option, essayez la Méthode 2 (nouveau commit)

### Le redéploiement échoue
- Vérifiez les logs de build dans Vercel
- Assurez-vous qu'il n'y a pas d'erreurs de compilation
- Vérifiez que toutes les dépendances sont dans `package.json`

### Les variables ne sont toujours pas prises en compte
- Vérifiez que vous avez bien coché les 3 environnements
- Assurez-vous d'avoir redéployé APRÈS avoir ajouté les variables
- Vérifiez l'orthographe exacte des noms de variables (sensible à la casse)
