# Guide d'intégration du formulaire de recrutement

## Instructions pour WordPress/Elementor

1. **Copiez le code du formulaire**
   - Ouvrez le fichier `FORMULAIRE_RECRUTEMENT.html`
   - Copiez tout le contenu (HTML, CSS, JavaScript)

2. **Intégrez dans Elementor**
   - Dans votre page WordPress, ajoutez un widget "HTML"
   - Collez le code copié dans le widget
   - **IMPORTANT** : Modifiez la ligne suivante dans le script :
     ```javascript
     const API_URL = 'https://dash.leplombier.ma/api/webhook/recruitment';
     ```
     Remplacez par votre URL de production si différente.

3. **Testez le formulaire**
   - Remplissez le formulaire avec des données de test
   - Vérifiez que la candidature apparaît dans la section "Candidatures" du dashboard admin

## Configuration de l'API

L'API est déjà configurée dans `app/api/webhook/recruitment/route.ts`.

### Variables d'environnement requises

Assurez-vous que les variables suivantes sont configurées dans Vercel :

- `FIREBASE_SERVICE_ACCOUNT_KEY` : Clé de compte de service Firebase (JSON)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` : Configuration SMTP
- `NOTIFICATION_EMAIL` : Email pour recevoir les notifications (optionnel, par défaut: ogincema@gmail.com)

## Gestion des candidatures dans le dashboard

1. **Accéder à la section Candidatures**
   - Connectez-vous en tant qu'admin
   - Cliquez sur "Candidatures" dans le menu de gauche

2. **Filtrer les candidatures**
   - Utilisez la barre de recherche pour trouver par nom, téléphone ou spécialité
   - Filtrez par statut (En attente, Contacté, Accepté, Rejeté)
   - Filtrez par zone (Casablanca, Rabat, Tanger, etc.)

3. **Gérer les statuts**
   - **En attente** : Candidature reçue, pas encore traitée
   - **Contacté** : Vous avez contacté le candidat
   - **Accepté** : Candidature acceptée
   - **Rejeté** : Candidature rejetée

## Zones disponibles

- Casablanca (casa)
- Rabat (rabat)
- Tanger (tanger)
- Marrakech (marrakech)
- Agadir (agadir)
- Tétouan (tetouan)
- Fès (fes)

## Notifications par email

Lorsqu'une nouvelle candidature est soumise, un email est automatiquement envoyé à l'adresse configurée dans `NOTIFICATION_EMAIL` (par défaut: ogincema@gmail.com).

L'email contient :
- Nom complet du candidat
- Numéro de téléphone
- Spécialité
- Zone
- Adresse
- Date de candidature
