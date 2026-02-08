# Envoi de messages

## Description

Le système permet d'envoyer des SMS et emails **manuellement** à vos clients. Vous choisissez le modèle de message, les destinataires et les canaux (SMS/Email) avant chaque envoi.

## Fonctionnalités

- **Modèles de messages** : Créer, modifier, masquer des templates (promotion, avertissement)
- **Envoi manuel** : Sélection des clients, choix des canaux, prévisualisation, confirmation
- **Types** : Promotion, Avertissement
- **SMS et Email** : Activer/désactiver indépendamment par template
- **Suivi** : Historique des messages envoyés dans la collection `sentMessages`

## Workflow d'envoi

1. Aller dans **Messages** (menu admin)
2. Cliquer sur **Envoyer** (icône verte) sur le modèle souhaité
3. Dans la modale :
   - **Rechercher** des clients par nom, email ou téléphone
   - **Filtrer** : "Avec téléphone", "Avec email"
   - **Sélectionner** les clients (cases à cocher, bouton "Tout sélectionner")
   - **Choisir les canaux** : SMS et/ou Email (selon la configuration du modèle)
   - **Aperçu** : Vérifier le rendu pour un client exemple
4. Cliquer sur **Envoyer**
5. L'API envoie les messages et affiche le résultat (succès/échecs)

## API d'envoi

**Endpoint** : `POST /api/auto-messages/send`

**Body** :
```json
{
  "messageId": "id_du_template",
  "clientIds": ["client1", "client2"],
  "channels": { "sms": true, "email": true }
}
```

**Variables dans les messages** :
- `{{clientName}}` : Nom du client
- `{{projectTitle}}` : Dernier projet terminé ou "Intervention"
- `{{amount}}` : Montant du dernier projet/dépannage ou vide

## Collections Firestore

### `autoMessages`
Modèles de messages configurés (nom, type, contenu SMS/email, canaux activés).

### `sentMessages`
Historique des messages envoyés :
- `autoMessageId`, `clientId`, `projectId?`, `manualRevenueId?`
- `type` : 'sms' | 'email'
- `status` : 'sent' | 'failed'
- `sentAt`, `errorMessage?`

## Configuration Email et SMS

Les envois passent par les API `/api/client/send-email` et `/api/client/send-sms`. La configuration (SMTP pour l'email, Infobip ou Twilio pour le SMS) est identique à celle des envois depuis la fiche client.
