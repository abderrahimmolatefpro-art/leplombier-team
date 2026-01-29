# 🔗 Intégration du formulaire existant avec le CRM

## Modifications à apporter

Le formulaire existant envoie actuellement les données vers WhatsApp. Nous allons ajouter l'envoi au CRM via l'API webhook.

## Code JavaScript à ajouter/modifier

### 1. Configuration de l'API (à ajouter en haut du script)

Ajoutez cette configuration juste après `jQuery(document).ready(function($) {` :

```javascript
// Configuration de l'API CRM
const CRM_API_URL = 'http://localhost:3000/api/webhook/client'; // Pour développement
// OU pour production : 'https://votre-domaine.vercel.app/api/webhook/client'
const CRM_API_KEY = ''; // Optionnel : votre clé API si configurée
```

### 2. Fonction pour envoyer au CRM (à ajouter)

Ajoutez cette fonction avant le gestionnaire `$('#submit-service-request')` :

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

### 3. Modification du gestionnaire de soumission

Remplacez le gestionnaire `$('#submit-service-request').on('click', function() {` par cette version modifiée :

```javascript
// Gérer l'envoi de la demande de service
$('#submit-service-request').on('click', async function() {
  const button = $(this);
  const originalText = button.text();
  
  const clientName = $('#client-name').val().trim();
  const clientPhone = $('#client-phone').val().trim();
  
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
  
  // Préparer les données pour le CRM
  const crmData = {
    name: clientName,
    phone: clientPhone,
    email: '', // Pas d'email dans le formulaire actuel
    address: address,
    city: extractCityFromAddress(address), // Fonction à créer
    postalCode: '', // Optionnel
    clientType: 'particulier', // Par défaut
    companyName: '',
    ice: '',
    message: `Service demandé: ${serviceLabel}\nType: ${selectedNeed}\nDétail: ${selectedDetail}\nVisite requise: ${visitRequired ? 'Oui' : 'Non'}\nCoordonnées GPS: ${lat}, ${lng}`,
  };
  
  // Envoyer au CRM (en arrière-plan, ne bloque pas l'envoi WhatsApp)
  sendToCRM(crmData).then(result => {
    if (result.success) {
      console.log('✅ Données envoyées au CRM avec succès');
    } else {
      console.warn('⚠️ Erreur lors de l\'envoi au CRM:', result.error);
      // Ne pas bloquer l'utilisateur si le CRM échoue
    }
  });
  
  // Préparer le message WhatsApp (comme avant)
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
  
  // Rediriger vers WhatsApp
  window.location.href = whatsappLink;
});
```

### 4. Fonction helper pour extraire la ville (à ajouter)

Ajoutez cette fonction pour extraire la ville de l'adresse :

```javascript
// Fonction pour extraire la ville de l'adresse
function extractCityFromAddress(address) {
  if (!address) return '';
  
  // Liste des villes marocaines communes
  const cities = [
    'Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir',
    'Meknès', 'Oujda', 'Kenitra', 'Tétouan', 'Safi', 'Mohammedia',
    'El Jadida', 'Nador', 'Beni Mellal', 'Khouribga', 'Settat',
    'Larache', 'Ksar El Kebir', 'Taza', 'Béni Mellal', 'Azrou'
  ];
  
  // Chercher une ville dans l'adresse
  for (const city of cities) {
    if (address.toLowerCase().includes(city.toLowerCase())) {
      return city;
    }
  }
  
  // Si aucune ville trouvée, essayer d'extraire depuis la structure de l'adresse
  // Format typique: "Rue..., Quartier..., Ville, Code postal"
  const parts = address.split(',');
  if (parts.length >= 2) {
    return parts[parts.length - 2].trim();
  }
  
  return '';
}
```

## 📝 Code complet modifié

Voici le code JavaScript complet avec les modifications :

[Le code complet sera dans le fichier suivant]
