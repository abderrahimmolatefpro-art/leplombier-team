# Configuration Firebase

## 1. Créer un projet Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquez sur "Ajouter un projet"
3. Suivez les étapes pour créer votre projet

## 2. Activer Authentication

1. Dans la console Firebase, allez dans "Authentication"
2. Cliquez sur "Commencer"
3. Activez "Email/Password" comme méthode de connexion

## 3. Créer Firestore Database

1. Dans la console Firebase, allez dans "Firestore Database"
2. Cliquez sur "Créer une base de données"
3. Choisissez le mode "Production" ou "Test" (pour commencer)
4. Sélectionnez une région (ex: europe-west)

## 4. Règles de sécurité Firestore

Ajoutez ces règles dans l'onglet "Règles" de Firestore :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Fonction helper pour vérifier l'authentification
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Fonction helper pour vérifier le rôle
    function isAdmin() {
      return isAuthenticated() && 
             exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Fonction helper pour vérifier si c'est le même utilisateur
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Collection users
    match /users/{userId} {
      allow read: if isAuthenticated();
      // Permettre la création si :
      // 1. Un utilisateur crée son propre document (userId == request.auth.uid) - permet la création du premier admin
      // 2. OU c'est un admin qui crée un autre utilisateur
      allow create: if isAuthenticated() && (
        userId == request.auth.uid ||
        isAdmin()
      );
      allow update: if isAuthenticated() && (isAdmin() || isOwner(userId));
      allow delete: if isAuthenticated() && isAdmin();
    }
    
    // Collection clients
    match /clients/{clientId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isAuthenticated() && isAdmin();
    }
    
    // Collection projects
    match /projects/{projectId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isAuthenticated() && isAdmin();
    }
    
    // Collection planning
    match /planning/{entryId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isAuthenticated();
    }
    
    // Collection documents
    match /documents/{documentId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isAuthenticated() && isAdmin();
    }
    
    // Collection manualRevenues (revenus manuels)
    match /manualRevenues/{revenueId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isAuthenticated();
    }
  }
}
```

## 5. Obtenir les clés de configuration

1. Dans la console Firebase, allez dans "Paramètres du projet" (icône d'engrenage)
2. Allez dans l'onglet "Vos applications"
3. Cliquez sur l'icône Web (`</>`)
4. Enregistrez l'app avec un nom (ex: "CRM Plomberie")
5. Copiez les valeurs de configuration Firebase

## 6. Configurer les variables d'environnement

Créez un fichier `.env.local` à la racine du projet avec :

```
NEXT_PUBLIC_FIREBASE_API_KEY=votre_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=votre_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=votre_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=votre_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=votre_app_id
```

## 7. Créer le premier utilisateur admin

1. Dans Firebase Authentication, créez un utilisateur avec email/password
2. Notez l'UID de cet utilisateur
3. Dans Firestore, créez un document dans la collection `users` avec :
   - ID: l'UID de l'utilisateur
   - Champs:
     - `email`: l'email de l'utilisateur
     - `name`: le nom de l'utilisateur
     - `role`: "admin"
     - `phone`: (optionnel)
     - `createdAt`: timestamp actuel
     - `updatedAt`: timestamp actuel

## 8. Créer des utilisateurs plombiers

Pour créer des plombiers, répétez l'étape 7 mais avec `role: "plombier"`.
