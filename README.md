# CRM Plomberie

Application interne de gestion de plomberie pour remplacer WhatsApp et les fichiers manuels.

## Fonctionnalités

- **Gestion des utilisateurs** : Admin et Plombiers
- **CRM clients** : Gestion complète de la base clients
- **Projets/Travaux** : 
  - Types : recherche de fuite, réparation lourde, rénovation salle de bain
  - Équipes avec chef d'équipe
  - Durée multi-jours
  - Suivi d'avancement
- **Planning** :
  - Planning individuel et global
  - Gestion des congés et indisponibilités
  - Détection de conflits
- **Documents** : Factures, Devis, Bons de commande

## Technologies

- Next.js 14
- Firebase (Auth + Firestore)
- TypeScript
- Tailwind CSS
- Vercel (déploiement)

## Installation

```bash
npm install
```

## Configuration Firebase

1. Créer un projet Firebase
2. Copier les variables d'environnement dans `.env.local` :

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Développement

```bash
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## Déploiement sur Vercel

L'application est prête pour être déployée sur Vercel. Connectez votre repository GitHub et Vercel détectera automatiquement Next.js.
