# 📘 Guide complet d'intégration du formulaire existant avec le CRM

## 🎯 Objectif

Intégrer votre formulaire WordPress existant (qui envoie vers WhatsApp) pour qu'il envoie **aussi** les données au CRM automatiquement.

## ✅ Avantages

- ✅ Les demandes sont automatiquement enregistrées dans le CRM
- ✅ Vous recevez un email de notification à `ogincema@gmail.com`
- ✅ L'envoi WhatsApp continue de fonctionner normalement
- ✅ Si le CRM échoue, WhatsApp fonctionne quand même (non bloquant)

## 📝 Étapes d'intégration

### Étape 1 : Ajouter la configuration de l'API

Dans votre code JavaScript existant, ajoutez **juste après** `jQuery(document).ready(function($) {` :

```javascript
// Configuration de l'API CRM
const CRM_API_URL = 'http://localhost:3000/api/webhook/client'; // Pour développement
// OU pour production : 'https://votre-domaine.vercel.app/api/webhook/client'
// OU avec ngrok : 'https://votre-url.ngrok.io/api/webhook/client'
const CRM_API_KEY = ''; // Optionnel : votre clé API si configurée
```

### Étape 2 : Ajouter la fonction sendToCRM

Ajoutez cette fonction **avant** le gestionnaire `$('#submit-service-request')` :

```javascript
// Fonction pour envoyer les données au CRM
async function sendToCRM(clientData) {
  try {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (CRM_API_KEY) {
      headers['x-api-key'] = CRM_API_KEY;
    }
    
    const response = await fetch(CRM_API_URL, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(clientData),
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Client créé dans le CRM:', result.clientId);
      return { success: true, clientId: result.clientId };
    } else {
      console.error('❌ Erreur CRM:', result.error);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('❌ Erreur de connexion au CRM:', error);
    return { success: false, error: error.message };
  }
}
```

### Étape 3 : Ajouter la fonction extractCityFromAddress

Ajoutez cette fonction helper :

```javascript
// Fonction pour extraire la ville de l'adresse
function extractCityFromAddress(address) {
  if (!address) return '';
  
  const cities = [
    'Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir',
    'Meknès', 'Oujda', 'Kenitra', 'Tétouan', 'Safi', 'Mohammedia',
    'El Jadida', 'Nador', 'Beni Mellal', 'Khouribga', 'Settat',
    'Larache', 'Ksar El Kebir', 'Taza', 'Béni Mellal', 'Azrou'
  ];
  
  for (const city of cities) {
    if (address.toLowerCase().includes(city.toLowerCase())) {
      return city;
    }
  }
  
  const parts = address.split(',');
  if (parts.length >= 2) {
    return parts[parts.length - 2].trim();
  }
  
  return '';
}
```

### Étape 4 : Modifier le gestionnaire de soumission

**Remplacez** votre gestionnaire actuel `$('#submit-service-request').on('click', function() {` par cette version :

```javascript
$('#submit-service-request').on('click', async function() {
  const button = $(this);
  const originalText = button.text();
  
  const clientName = $('#client-name').val().trim();
  const clientPhone = $('#client-phone').val().trim();
  
  // Validation (gardez votre validation existante)
  if (!clientName || clientName.length < 3) {
    alert('Veuillez saisir votre nom complet (minimum 3 caractères)');
    $('#client-name').focus();
    return;
  }
  
  if (!validateMoroccanPhone(clientPhone)) {
    alert('Veuillez saisir un numéro de téléphone marocain valide\nExemples acceptés:\n- 0612345678\n- 212612345678\n- +212612345678');
    $('#client-phone').focus();
    return;
  }
  
  const address = $('#selected-address').val();
  if (!address) {
    alert('Veuillez sélectionner une adresse avant de continuer');
    goToStep('step-address');
    return;
  }
  
  const serviceLabel = $('#service-type-display').text();
  const visitRequired = $('#visit-required').val() === 'true';
  const selectedNeed = $('#selected-need').val();
  const selectedDetail = $('#selected-detail').val();
  const lat = $('#selected-lat').val();
  const lng = $('#selected-lng').val();
  
  // Désactiver le bouton pendant l'envoi
  button.prop('disabled', true).text('Envoi en cours...');
  
  // ============================================
  // NOUVEAU : Préparer les données pour le CRM
  // ============================================
  const crmData = {
    name: clientName,
    phone: clientPhone,
    email: '', // Pas d'email dans le formulaire actuel
    address: address,
    city: extractCityFromAddress(address),
    postalCode: '',
    clientType: 'particulier',
    companyName: '',
    ice: '',
    message: `Service demandé: ${serviceLabel}\nType: ${selectedNeed}\nDétail: ${selectedDetail}\nVisite requise: ${visitRequired ? 'Oui' : 'Non'}\nCoordonnées GPS: ${lat}, ${lng}\nLien Google Maps: https://www.google.com/maps?q=${lat},${lng}`,
  };
  
  // ============================================
  // NOUVEAU : Envoyer au CRM (non bloquant)
  // ============================================
  sendToCRM(crmData).then(result => {
    if (result.success) {
      console.log('✅ Données envoyées au CRM avec succès - ID:', result.clientId);
    } else {
      console.warn('⚠️ Erreur lors de l\'envoi au CRM:', result.error);
      // Ne pas bloquer l'utilisateur si le CRM échoue
    }
  });
  
  // ============================================
  // EXISTANT : Préparer le message WhatsApp (comme avant)
  // ============================================
  let message = '🔧 *DEMANDE DE SERVICE*\n\n';
  message += '📋 *Service:* ' + serviceLabel + '\n';
  message += '👤 *Client:* ' + clientName + '\n';
  message += '📱 *Téléphone:* ' + clientPhone + '\n';
  message += '📍 *Adresse:* ' + address + '\n';
  
  if (visitRequired) {
    message += '\n⚠️ *VISITE PRÉALABLE REQUISE* ⚠️\n';
  }
  
  message += '\n🗺️ *Localisation:*\n';
  message += 'https://www.google.com/maps?q=' + lat + ',' + lng;
  
  const encodedMessage = encodeURIComponent(message);
  const whatsappNumber = '212671052371';
  const whatsappLink = 'https://wa.me/' + whatsappNumber + '?text=' + encodedMessage;
  
  console.log('Redirection vers WhatsApp');
  
  // Réactiver le bouton
  button.prop('disabled', false).text(originalText);
  
  // Rediriger vers WhatsApp (comme avant)
  window.location.href = whatsappLink;
});
```

## 🔧 Configuration de l'URL d'API

### Pour le développement (test local) :

```javascript
const CRM_API_URL = 'http://localhost:3000/api/webhook/client';
```

**Important :** Cela ne fonctionnera que si WordPress est aussi en local. Sinon, utilisez ngrok.

### Avec ngrok (pour tester depuis un site WordPress en production) :

1. Installez ngrok : `brew install ngrok`
2. Démarrez votre serveur Next.js : `npm run dev`
3. Dans un autre terminal : `ngrok http 3000`
4. Copiez l'URL HTTPS fournie (ex: `https://abc123.ngrok.io`)
5. Utilisez-la dans le code :

```javascript
const CRM_API_URL = 'https://abc123.ngrok.io/api/webhook/client';
```

### Pour la production (après déploiement sur Vercel) :

```javascript
const CRM_API_URL = 'https://votre-domaine.vercel.app/api/webhook/client';
```

## ✅ Vérification

Après avoir intégré le code :

1. **Ouvrez la console du navigateur** (F12 > Console)
2. **Soumettez le formulaire**
3. **Vérifiez les logs** :
   - Vous devriez voir : `✅ Client créé dans le CRM: [ID]`
   - Ou une erreur si quelque chose ne va pas

4. **Vérifiez dans le CRM** :
   - Connectez-vous au CRM
   - Allez dans "Clients"
   - Le nouveau client devrait apparaître

5. **Vérifiez l'email** :
   - Un email devrait être envoyé à `ogincema@gmail.com`
   - (Seulement si SMTP est configuré)

## 🐛 Dépannage

### Le client n'apparaît pas dans le CRM

1. **Vérifiez la console du navigateur** pour les erreurs
2. **Vérifiez que l'URL d'API est correcte**
3. **Vérifiez que le serveur Next.js est démarré** (pour localhost)
4. **Vérifiez les logs du serveur Next.js** pour voir les erreurs

### Erreur CORS

Si vous voyez une erreur CORS, c'est normal - l'API gère déjà CORS. Vérifiez que l'URL est correcte.

### L'envoi WhatsApp fonctionne mais pas le CRM

C'est normal si le CRM échoue - l'envoi WhatsApp continue. Vérifiez :
- L'URL d'API est correcte
- Le serveur Next.js est démarré
- Les variables d'environnement sont configurées

## 📊 Données envoyées au CRM

Le formulaire envoie ces données :

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

## 🎉 Résultat

Après intégration :
- ✅ Chaque soumission de formulaire crée automatiquement un client dans le CRM
- ✅ Vous recevez un email de notification
- ✅ L'envoi WhatsApp continue de fonctionner
- ✅ Les données sont centralisées dans le CRM
