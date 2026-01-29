# Fonctionnalités Documents Professionnels

## Vue d'ensemble

La section Documents a été améliorée pour permettre la génération de documents professionnels (factures, devis, bons de commande) avec un design inspiré de votre facture existante.

## Fonctionnalités

### 1. Visualisation Professionnelle
- Design professionnel inspiré de votre facture Le Plombier.MA
- En-tête avec logo/nom de l'entreprise
- Numéro de document et date bien visibles
- Informations client clairement affichées
- Tableau avec en-tête bleu foncé
- Totaux HT, TVA et TTC
- Section signature avec tampon
- Mentions légales
- Pied de page avec informations complètes de l'entreprise

### 2. Génération PDF
- **Télécharger PDF** : Génère un fichier PDF directement téléchargeable
- **Imprimer** : Ouvre la boîte de dialogue d'impression du navigateur

### 3. Formatage Professionnel
- Nombres formatés en français (1 700,00 au lieu de 1700,00)
- Devise en MAD (Dirhams marocains)
- Mise en page optimisée pour l'impression A4

## Utilisation

### Accéder à un document

1. Allez dans la section **Documents**
2. Cliquez sur l'icône 👁️ (œil) à côté du document que vous souhaitez visualiser
3. Vous serez redirigé vers la page de visualisation

### Générer un PDF

Sur la page de visualisation :
1. Cliquez sur **"Télécharger PDF"** pour générer et télécharger le PDF
2. Le fichier sera nommé selon le format : `{type}-{numero}.pdf` (ex: `facture-FAC-2025-0001.pdf`)

### Imprimer un document

Sur la page de visualisation :
1. Cliquez sur **"Imprimer"**
2. La boîte de dialogue d'impression s'ouvre
3. Configurez vos paramètres d'impression et imprimez

## Configuration de l'entreprise

Les informations de l'entreprise sont configurées dans `lib/companyConfig.ts`. Vous pouvez modifier :

- Nom de l'entreprise
- Adresse
- Téléphone
- Email
- Site web
- Numéros SIRET, RC, ICE, Patente
- Logo (ajoutez votre logo dans `public/logo.png`)

### Ajouter un logo

1. Placez votre fichier logo dans `public/logo.png`
2. Le logo s'affichera automatiquement dans les documents

## Structure des documents

### En-tête
- Logo/Nom de l'entreprise (centré)
- Type de document et numéro (gauche)
- Date (droite)

### Informations client
- Nom du client
- Adresse complète
- Téléphone et email
- ICE (si disponible)

### Tableau des articles
- Description
- Quantité
- Prix unitaire (MAD)
- Total (MAD)

### Totaux
- Total HT
- TVA (20%)
- Total TTC

### Signature et mentions légales
- Section signature
- Tampon de l'entreprise
- Mentions légales (Art 89 – II – 1° - c, Code Général des Impôts)

### Pied de page
- Nom de l'entreprise
- Siège social
- RC, ICE, Patente
- Téléphone, Email, Site web

## Personnalisation

### Modifier les couleurs

Les couleurs peuvent être modifiées dans `components/DocumentView.tsx` :
- En-tête tableau : `bg-primary-700` (bleu foncé)
- Titre document : `text-primary-600` (bleu)
- Total TTC : `text-primary-600` (bleu)

### Modifier le taux de TVA

Le taux de TVA est actuellement fixé à 20%. Pour le modifier :
1. Allez dans `app/documents/page.tsx`
2. Recherchez `tax = subtotal * 0.2`
3. Modifiez le multiplicateur (ex: `0.1` pour 10%)

## Notes techniques

- Les PDFs sont générés avec `jsPDF` et `html2canvas`
- L'impression utilise `react-to-print`
- Format de page : A4
- Marges : 20mm

## Support

Pour toute question ou problème, consultez la documentation ou contactez le support technique.
