# 🔧 Correction des Permissions Firestore

## ⚠️ ERREUR : Missing or insufficient permissions

Cette erreur signifie que les règles Firestore ne permettent pas l'accès à certaines collections.

## Solution Rapide

### 1. Ouvrez Firebase Console
https://console.firebase.google.com/project/leplombier-team/firestore/rules

### 2. Copiez-collez ces règles COMPLÈTES :

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
    
    // Collection manualRevenues (revenus manuels) - IMPORTANT !
    match /manualRevenues/{revenueId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isAuthenticated();
    }
  }
}
```

### 3. Cliquez sur "Publier" (en haut à droite)

### 4. Attendez 10-20 secondes pour la propagation

### 5. Rechargez votre application

## Vérifications

✅ Vérifiez que vous êtes connecté  
✅ Vérifiez que votre utilisateur existe dans `users/{votre-uid}` avec le champ `role`  
✅ Vérifiez que les règles sont bien publiées (pas seulement sauvegardées)

## Collections nécessaires

Les règles doivent permettre l'accès à :
- ✅ `users` - Utilisateurs
- ✅ `clients` - Clients
- ✅ `projects` - Projets
- ✅ `planning` - Planning
- ✅ `documents` - Documents (factures, devis)
- ✅ `manualRevenues` - **NOUVEAU** : Revenus manuels

## Test rapide

Après avoir publié les règles, essayez :
1. Recharger la page des clients
2. Ajouter un revenu manuel sur un client
3. Vérifier que ça fonctionne

Si l'erreur persiste, vérifiez la console du navigateur pour plus de détails.
