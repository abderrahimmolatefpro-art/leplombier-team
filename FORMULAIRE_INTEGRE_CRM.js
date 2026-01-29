/**
 * INTÉGRATION CRM - Code JavaScript à ajouter/modifier dans votre formulaire existant
 * 
 * Instructions :
 * 1. Ajoutez la configuration de l'API en haut du script
 * 2. Ajoutez la fonction sendToCRM
 * 3. Ajoutez la fonction extractCityFromAddress
 * 4. Remplacez le gestionnaire $('#submit-service-request')
 */

// ============================================
// 1. CONFIGURATION DE L'API CRM
// ============================================
// Ajoutez ceci juste après jQuery(document).ready(function($) {

const CRM_API_URL = 'http://localhost:3000/api/webhook/client'; // Pour développement
// OU pour production : 'https://votre-domaine.vercel.app/api/webhook/client'
// OU avec ngrok : 'https://votre-url.ngrok.io/api/webhook/client'
const CRM_API_KEY = ''; // Optionnel : votre clé API si configurée dans .env.local

// ============================================
// 2. FONCTION POUR ENVOYER AU CRM
// ============================================

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
    // Ne pas bloquer l'utilisateur si le CRM échoue
    return { success: false, error: error.message };
  }
}

// ============================================
// 3. FONCTION POUR EXTRAIRE LA VILLE
// ============================================

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
    const potentialCity = parts[parts.length - 2].trim();
    // Vérifier si c'est une ville connue
    for (const city of cities) {
      if (potentialCity.toLowerCase().includes(city.toLowerCase())) {
        return city;
      }
    }
    return potentialCity; // Retourner même si pas dans la liste
  }
  
  return '';
}

// ============================================
// 4. GESTIONNAIRE MODIFIÉ POUR LA SOUMISSION
// ============================================
// Remplacez votre gestionnaire $('#submit-service-request') par celui-ci :

/*
$('#submit-service-request').on('click', async function() {
  const button = $(this);
  const originalText = button.text();
  
  const clientName = $('#client-name').val().trim();
  const clientPhone = $('#client-phone').val().trim();
  
  // Validation (comme avant)
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
  // PRÉPARER LES DONNÉES POUR LE CRM
  // ============================================
  const crmData = {
    name: clientName,
    phone: clientPhone,
    email: '', // Pas d'email dans le formulaire actuel
    address: address,
    city: extractCityFromAddress(address),
    postalCode: '', // Optionnel
    clientType: 'particulier', // Par défaut
    companyName: '',
    ice: '',
    message: `Service demandé: ${serviceLabel}\nType: ${selectedNeed}\nDétail: ${selectedDetail}\nVisite requise: ${visitRequired ? 'Oui' : 'Non'}\nCoordonnées GPS: ${lat}, ${lng}\nLien Google Maps: https://www.google.com/maps?q=${lat},${lng}`,
  };
  
  // ============================================
  // ENVOYER AU CRM (en arrière-plan, non bloquant)
  // ============================================
  sendToCRM(crmData).then(result => {
    if (result.success) {
      console.log('✅ Données envoyées au CRM avec succès - ID:', result.clientId);
      // Optionnel : afficher un message de succès discret
      // showLocationHelp('✅ Demande enregistrée dans le CRM', 'success');
    } else {
      console.warn('⚠️ Erreur lors de l\'envoi au CRM:', result.error);
      // Ne pas bloquer l'utilisateur si le CRM échoue
      // L'envoi WhatsApp continuera normalement
    }
  });
  
  // ============================================
  // PRÉPARER LE MESSAGE WHATSAPP (comme avant)
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
*/

// ============================================
// NOTES IMPORTANTES
// ============================================
// 
// 1. L'envoi au CRM se fait en arrière-plan et ne bloque pas l'envoi WhatsApp
// 2. Si le CRM échoue, l'utilisateur est quand même redirigé vers WhatsApp
// 3. Les erreurs sont loggées dans la console pour le débogage
// 4. Pour la production, changez CRM_API_URL par votre URL Vercel ou ngrok
// 5. La fonction extractCityFromAddress peut être améliorée selon vos besoins
