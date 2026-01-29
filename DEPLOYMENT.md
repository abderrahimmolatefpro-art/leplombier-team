# Guide de déploiement sur Vercel

## Prérequis

1. Un compte GitHub
2. Un compte Vercel (gratuit)
3. Un projet Firebase configuré (voir FIREBASE_SETUP.md)

## Étapes de déploiement

### 1. Préparer le code

Assurez-vous que votre code est prêt :
- Toutes les dépendances sont dans `package.json`
- Les fichiers de configuration sont présents
- Le fichier `.env.local` n'est PAS commité (déjà dans `.gitignore`)

### 2. Pousser sur GitHub

```bash
git init
git add .
git commit -m "Initial commit - CRM Plomberie"
git branch -M main
git remote add origin https://github.com/votre-username/votre-repo.git
git push -u origin main
```

### 3. Connecter à Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Connectez-vous avec GitHub
3. Cliquez sur "Add New Project"
4. Importez votre repository GitHub
5. Vercel détectera automatiquement Next.js

### 4. Configurer les variables d'environnement

Dans les paramètres du projet Vercel :
1. Allez dans "Settings" > "Environment Variables"
2. Ajoutez toutes les variables Firebase :
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`

### 5. Déployer

1. Cliquez sur "Deploy"
2. Attendez que le déploiement se termine
3. Votre application sera disponible à l'URL fournie par Vercel

### 6. Configuration Firebase pour la production

Dans Firebase Console :
1. Allez dans "Authentication" > "Settings" > "Authorized domains"
2. Ajoutez le domaine Vercel (ex: `votre-projet.vercel.app`)

## Mises à jour futures

À chaque push sur la branche `main`, Vercel déploiera automatiquement une nouvelle version.

Pour déployer manuellement :
```bash
vercel --prod
```

## Domaines personnalisés

1. Dans Vercel, allez dans "Settings" > "Domains"
2. Ajoutez votre domaine personnalisé
3. Suivez les instructions pour configurer les DNS
