# Configuration du Tampon GROUPE OGINCE

## Ajouter l'image du tampon

Pour utiliser l'image du tampon telle quelle sur vos documents :

1. **Placez votre image du tampon** dans le dossier `public/`
   - Nom du fichier : `stamp.png` (ou `stamp.jpg`)
   - Format recommandé : PNG avec fond transparent
   - Taille recommandée : environ 180x80 pixels

2. **L'image sera automatiquement utilisée** sur tous les documents

## Configuration actuelle

Le système est configuré pour chercher l'image à : `/stamp.png`

Si l'image n'est pas trouvée, le système utilisera automatiquement le texte du tampon comme solution de secours.

## Emplacement du fichier

```
crm/
└── public/
    └── stamp.png  ← Placez votre image ici
```

## Formats supportés

- PNG (recommandé, supporte la transparence)
- JPG/JPEG
- SVG

## Note importante

L'image sera automatiquement incluse dans :
- ✅ La visualisation HTML des documents
- ✅ Les PDFs générés via "Télécharger PDF" (utilise html2canvas qui capture l'image)
- ⚠️ Les PDFs générés directement depuis les données (peut nécessiter que l'image soit accessible)

Pour une meilleure compatibilité, utilisez toujours le bouton "Télécharger PDF" qui capture l'image correctement.
