# 🚨 URGENT : Publier les règles Firestore

## Le problème

L'erreur "Missing or insufficient permissions" signifie que les règles Firestore dans Firebase Console ne sont pas à jour avec le code.

## Solution en 3 étapes

### Étape 1 : Ouvrir Firebase Console

1. Allez sur : https://console.firebase.google.com
2. Sélectionnez votre projet : **leplombier-team**
3. Dans le menu de gauche, cliquez sur **Firestore Database**
4. Cliquez sur l'onglet **"Règles"** (en haut)

### Étape 2 : Copier les règles

**Copiez TOUT le contenu ci-dessous** et remplacez ce qui est dans l'éditeur :

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

### Étape 3 : Publier

1. Cliquez sur le bouton **"Publier"** (en haut à droite, bouton bleu)
2. Attendez le message de confirmation
3. Attendez 10-20 secondes pour la propagation des règles
4. Rechargez votre application (F5 ou Cmd+R)

## ✅ Vérification

Après avoir publié, testez :
1. Rechargez la page des clients → devrait fonctionner
2. Ajoutez un revenu manuel → devrait fonctionner
3. Créez un projet avec montant → devrait fonctionner

## ⚠️ Si ça ne fonctionne toujours pas

1. **Vérifiez votre authentification** :
   - Déconnectez-vous puis reconnectez-vous
   - Vérifiez que vous êtes bien connecté

2. **Vérifiez votre utilisateur dans Firestore** :
   - Allez dans Firestore Database → Collection `users`
   - Vérifiez qu'il existe un document avec votre UID
   - Le document doit avoir un champ `role` avec la valeur `admin` ou `plombier`

3. **Vérifiez les règles** :
   - Assurez-vous que le bouton "Publier" a bien été cliqué
   - Vérifiez qu'il n'y a pas d'erreurs de syntaxe (elles apparaîtraient en rouge)

## 📝 Note importante

Les règles dans le fichier `firestore.rules` de votre projet sont correctes, mais elles doivent être **publiées dans Firebase Console** pour être actives. Le fichier local sert uniquement de référence.
