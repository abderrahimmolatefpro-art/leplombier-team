# 📋 Guide d'intégration du formulaire WordPress

## 📁 Fichiers disponibles

Deux versions du formulaire sont disponibles :

1. **`WORDPRESS_FORM_SIMPLE.html`** - Version pour la **production**
   - URL d'API : `https://votre-domaine.vercel.app/api/webhook/client`
   - À utiliser une fois l'application déployée sur Vercel

2. **`WORDPRESS_FORM_DEVELOPMENT.html`** - Version pour le **développement**
   - URL d'API : `http://localhost:3000/api/webhook/client`
   - À utiliser pour tester en local

## 🚀 Étapes d'intégration

### Option 1 : Développement (test local)

1. **Assurez-vous que le serveur Next.js est démarré** :
   ```bash
   npm run dev
   ```

2. **Ouvrez `WORDPRESS_FORM_DEVELOPMENT.html`**

3. **Copiez tout le contenu** (Ctrl+A, Ctrl+C)

4. **Dans WordPress/Elementor** :
   - Ajoutez un widget "HTML" ou "Code personnalisé"
   - Collez le code
   - Enregistrez

5. **Testez le formulaire** sur votre site WordPress

### Option 2 : Production (déployé sur Vercel)

1. **Déployez votre application sur Vercel** (voir `DEPLOYMENT.md`)

2. **Notez l'URL de votre application** (ex: `https://crm-plomberie.vercel.app`)

3. **Ouvrez `WORDPRESS_FORM_SIMPLE.html`**

4. **Remplacez l'URL d'API** (ligne ~279) :
   ```javascript
   // Remplacez cette ligne :
   const API_URL = 'https://votre-domaine.vercel.app/api/webhook/client';
   
   // Par votre URL réelle :
   const API_URL = 'https://crm-plomberie.vercel.app/api/webhook/client';
   ```

5. **Copiez tout le contenu** et collez-le dans Elementor

## ⚙️ Configuration optionnelle : Clé API

Si vous avez configuré `WEBHOOK_API_KEY` dans `.env.local`, ajoutez-la dans le formulaire :

```javascript
// Dans le fichier HTML, ligne ~280
const API_KEY = 'votre-cle-secrete-aleatoire';
```

**Note :** Si vous n'utilisez pas de clé API, laissez `API_KEY = ''` (vide).

## ✅ Vérification

Après avoir soumis le formulaire :

1. **Vérifiez dans le CRM** :
   - Connectez-vous au CRM
   - Allez dans la section "Clients"
   - Le nouveau client devrait apparaître

2. **Vérifiez l'email** :
   - Un email devrait être envoyé à `ogincema@gmail.com`
   - (Seulement si SMTP est configuré dans `.env.local`)

## 🔧 Dépannage

### Le formulaire ne fonctionne pas

1. **Vérifiez la console du navigateur** (F12 > Console)
   - Cherchez les erreurs JavaScript
   - Vérifiez que l'URL d'API est correcte

2. **Vérifiez que le serveur Next.js est démarré** (pour le développement)

3. **Vérifiez que l'endpoint API est accessible** :
   ```bash
   curl http://localhost:3000/api/webhook/client
   # ou pour la production
   curl https://votre-domaine.vercel.app/api/webhook/client
   ```

### Le client n'apparaît pas dans le CRM

1. **Vérifiez les logs du serveur** pour voir les erreurs
2. **Vérifiez que Firebase Admin SDK est configuré** dans `.env.local`
3. **Vérifiez les règles Firestore** (elles devraient permettre la création)

### L'email n'est pas envoyé

1. **Vérifiez que SMTP est configuré** dans `.env.local`
2. **Pour Gmail**, utilisez un "Mot de passe d'application" (pas votre mot de passe normal)
3. **Vérifiez les logs du serveur** pour voir les erreurs d'envoi d'email

## 📝 Exemple de données envoyées

Le formulaire envoie ces données au webhook :

```json
{
  "name": "Ahmed Benali",
  "phone": "0612345678",
  "email": "ahmed@example.com",
  "address": "123 Rue Test",
  "city": "Casablanca",
  "postalCode": "20000",
  "clientType": "particulier",
  "companyName": "",
  "ice": "",
  "message": "Besoin d'une réparation urgente"
}
```

## 🎨 Personnalisation

Vous pouvez personnaliser les couleurs du formulaire en modifiant le CSS dans la section `<style>` :

- **Couleur principale (bleu)** : `#3b82f6` et `#1e40af`
- **Couleur de fond** : `#f0f9ff` et `#e0f2fe`
- **Couleur de texte** : `#1e40af`

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs du serveur Next.js
2. Vérifiez la console du navigateur
3. Testez l'endpoint API directement avec curl (voir ci-dessus)
