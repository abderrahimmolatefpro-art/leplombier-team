# 📋 Instructions d'intégration du formulaire avec CRM

## 🎯 Objectif

Intégrer votre formulaire WordPress existant pour qu'il envoie **automatiquement** les demandes au CRM en plus de WhatsApp.

## 📁 Fichier à utiliser

**`FORMULAIRE_COMPLET_AVEC_CRM.html`** - Code complet prêt à utiliser

## ✅ Étapes d'intégration

### 1. Ouvrir le fichier

Ouvrez `FORMULAIRE_COMPLET_AVEC_CRM.html` dans votre éditeur.

### 2. Configurer l'URL de l'API

Trouvez cette ligne (environ ligne 280) :

```javascript
const CRM_API_URL = 'http://localhost:3000/api/webhook/client';
```

**Remplacez-la** selon votre situation :

#### Pour le développement (test local) :
```javascript
const CRM_API_URL = 'http://localhost:3000/api/webhook/client';
```

#### Avec ngrok (pour tester depuis un site WordPress en production) :
```javascript
const CRM_API_URL = 'https://abc123.ngrok.io/api/webhook/client';
```
*(Remplacez `abc123.ngrok.io` par votre URL ngrok)*

#### Pour la production (après déploiement sur Vercel) :
```javascript
const CRM_API_URL = 'https://votre-domaine.vercel.app/api/webhook/client';
```
*(Remplacez `votre-domaine.vercel.app` par votre URL Vercel)*

### 3. Configurer la clé API (optionnel)

Si vous avez configuré `WEBHOOK_API_KEY` dans `.env.local`, ajoutez-la :

```javascript
const CRM_API_KEY = 'votre-cle-secrete-aleatoire';
```

Sinon, laissez vide :
```javascript
const CRM_API_KEY = '';
```

### 4. Copier le code dans WordPress/Elementor

1. **Sélectionnez TOUT le contenu** du fichier `FORMULAIRE_COMPLET_AVEC_CRM.html`
2. **Copiez** (Ctrl+C / Cmd+C)
3. **Dans WordPress/Elementor** :
   - Ajoutez un widget "HTML" ou "Code personnalisé"
   - **Collez le code complet**
   - Enregistrez

### 5. Tester

1. **Remplissez le formulaire** sur votre site WordPress
2. **Soumettez-le**
3. **Vérifiez** :
   - ✅ Redirection vers WhatsApp (comme avant)
   - ✅ Client créé dans le CRM (vérifiez dans le CRM)
   - ✅ Email reçu à `ogincema@gmail.com` (si SMTP configuré)

## 🔍 Vérification

### Dans la console du navigateur (F12 > Console)

Après soumission, vous devriez voir :
```
✅ Données envoyées au CRM avec succès - ID: [clientId]
```

Ou en cas d'erreur :
```
⚠️ Erreur lors de l'envoi au CRM: [message d'erreur]
```

### Dans le CRM

1. Connectez-vous au CRM
2. Allez dans "Clients"
3. Le nouveau client devrait apparaître avec :
   - Nom et téléphone
   - Adresse complète
   - Message avec les détails du service demandé

## 📊 Données envoyées au CRM

Le formulaire envoie automatiquement :

```json
{
  "name": "Nom du client",
  "phone": "0612345678",
  "email": "",
  "address": "Adresse complète",
  "city": "Ville extraite automatiquement",
  "postalCode": "",
  "clientType": "particulier",
  "companyName": "",
  "ice": "",
  "message": "Service demandé: ...\nType: ...\nDétail: ...\nCoordonnées GPS: ..."
}
```

## ⚠️ Points importants

1. **Non bloquant** : Si le CRM échoue, WhatsApp fonctionne quand même
2. **En arrière-plan** : L'envoi au CRM se fait sans bloquer l'utilisateur
3. **Automatique** : Chaque soumission crée un client dans le CRM
4. **Email** : Vous recevez une notification à `ogincema@gmail.com`

## 🐛 Dépannage

### Le client n'apparaît pas dans le CRM

1. **Vérifiez la console du navigateur** (F12 > Console) pour les erreurs
2. **Vérifiez que l'URL d'API est correcte**
3. **Vérifiez que le serveur Next.js est démarré** (pour localhost)
4. **Vérifiez les logs du serveur** pour voir les erreurs

### Erreur CORS

L'API gère déjà CORS. Vérifiez que l'URL est correcte.

### L'envoi WhatsApp fonctionne mais pas le CRM

C'est normal si le CRM échoue - l'envoi WhatsApp continue. Vérifiez :
- L'URL d'API est correcte
- Le serveur Next.js est démarré (pour localhost)
- Les variables d'environnement sont configurées

## 🎉 Résultat

Après intégration :
- ✅ Chaque soumission de formulaire crée automatiquement un client dans le CRM
- ✅ Vous recevez un email de notification
- ✅ L'envoi WhatsApp continue de fonctionner
- ✅ Les données sont centralisées dans le CRM
