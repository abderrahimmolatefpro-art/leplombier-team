# Règles Firestore Complètes

## ⚠️ IMPORTANT : Copiez ces règles dans Firebase Console

Allez dans Firebase Console → Firestore Database → Règles et remplacez TOUTES les règles par celles-ci :

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

## Vérification

Après avoir publié les règles :

1. Vérifiez que vous êtes bien connecté
2. Vérifiez que votre utilisateur existe dans la collection `users` avec le bon rôle
3. Testez en rechargeant la page

## Si l'erreur persiste

1. Vérifiez dans Firebase Console → Authentication que votre utilisateur existe
2. Vérifiez dans Firestore que le document utilisateur existe dans `users/{uid}` avec le champ `role`
3. Vérifiez que les règles sont bien publiées (bouton "Publier" en haut)
