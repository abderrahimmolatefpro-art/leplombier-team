# Activer l’API Places (Google Cloud Console)

Pour que les **suggestions d’adresse** fonctionnent sur la page Commander (espace client), l’API Places doit être activée dans Google Cloud.

## 1. Accéder à la Google Cloud Console

1. Va sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionne le projet lié à ton app (ex. `leplombier-team` si tu utilises Firebase)

## 2. Activer l’API Places

1. Menu **APIs & Services** → **Library** (Bibliothèque)
2. Recherche : **Places API**
3. Clique sur **Places API**
4. Clique sur **Enable** (Activer)

## 3. Vérifier la clé API

1. Menu **APIs & Services** → **Credentials**
2. Vérifie que ta clé API (`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`) existe
3. Si besoin, crée une clé : **Create credentials** → **API key**
4. Ajoute-la dans `.env.local` :

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=ta_cle_api
```

## 4. Restreindre la clé (recommandé en production)

1. Clique sur ta clé API
2. **Application restrictions** : HTTP referrers
3. Ajoute tes domaines : `localhost:*`, `*.vercel.app`, `*.leplombier.ma`
4. **API restrictions** : Restrict key
5. Coche : **Places API**, **Maps JavaScript API**, **Geocoding API**

## 5. Checklist

- [ ] Places API activée dans Google Cloud
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` dans `.env.local` (et sur Vercel en prod)
- [ ] Suggestions d’adresse visibles sur la page Commander

## APIs utilisées par le projet

| API | Usage |
|-----|-------|
| **Places API** | Autocomplete adresses (Commander) |
| **Maps JavaScript API** | Carte + marqueurs |
| **Geocoding API** | Conversion adresse → coordonnées |

## Dépannage : pas de suggestions

1. **Console navigateur** (F12 → Console) : vérifie les messages `[Places]` (clé manquante, API non disponible, erreur)
2. **Clé API** : si tu as des restrictions HTTP referrers, ajoute `http://localhost:3000/*` et `http://localhost:3001/*`
3. **Facturation** : Google exige un compte de facturation activé pour Places API (quota gratuit disponible)
4. **APIs activées** : Maps JavaScript API + Places API dans [APIs & Services](https://console.cloud.google.com/apis/library)
