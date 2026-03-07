# Checklist MA / ES — Vérification multi-pays

Ce document liste les points à contrôler pour éviter toute confusion entre **Maroc (MA)** et **Espagne (ES)**.

---

## 1. Configuration par déploiement

| Variable | leplombier.ma | leplombier.es |
|----------|---------------|---------------|
| `NEXT_PUBLIC_ACTIVE_COUNTRY` | `MA` | `ES` |
| Locale (i18n) | `fr` | `es` |
| Devise | MAD | EUR |
| Téléphone | +212 | +34 |

**Vérification :** Sur chaque projet Vercel, la variable `NEXT_PUBLIC_ACTIVE_COUNTRY` doit être correcte.

---

## 2. Isolation des données

| Entité | Champ `country` | Filtrage |
|--------|-----------------|----------|
| Clients | ✅ | Par pays dans les requêtes |
| Plombiers (users) | ✅ | Par pays |
| InstantRequests | ✅ | Par pays |
| Recruitments | ✅ | Par pays |
| Projets | Via clientId | Via clients |
| Commandes | Via clients/instantRequests | Via clientIds |

**Vérification :** Aucune requête ne doit mélanger MA et ES sans filtre explicite.

---

## 3. Affichage des montants

| Emplacement | Avant | Après |
|-------------|-------|-------|
| `lib/utils.formatCurrency` | Toujours MAD | MAD (MA) / EUR (ES) selon `getActiveCountry()` |
| InstantRequestCard | MAD en dur | `formatCurrency()` |
| InstantRequestDetail | MAD en dur | `formatCurrency()` |
| Codes promo (réduction fixe) | MAD en dur | `formatCurrency()` |
| Commander, Commandes client | ✅ | `formatCurrency()` avec pays |

**Vérification :** Sur leplombier.es, tous les montants doivent s’afficher en EUR.

---

## 4. API et pays

| API | Détection du pays |
|-----|-------------------|
| `verify` | `body.country` ou `host` (leplombier.es) |
| `send-code` | `body.country` ou `host` |
| `instant-request` | `client.country` (depuis token) |
| `instant-offer` | `request.country` |

**Vérification :** Les appels depuis le front passent `country: getActiveCountry()` quand c’est nécessaire.

---

## 5. Traductions (i18n)

| Espace | Locale MA | Locale ES |
|--------|-----------|-----------|
| espace-client | `messages/fr.json` | `messages/es.json` |
| espace-plombier | `messages/fr.json` | `messages/es.json` |

**Vérification :** `getLocale()` dans `lib/i18n.ts` renvoie `es` si `NEXT_PUBLIC_ACTIVE_COUNTRY === 'ES'`.

---

## 6. Points de vigilance

1. **Admin (dashboard, clients, etc.)** : L’admin peut voir MA et ES. Le filtre pays (`countryFilter`) doit être appliqué partout. Les montants affichés utilisent `formatCurrency(amount, country)` quand le pays de l’entité est connu.

2. **Téléphone** : `normalizePhoneNumber(phone, country)` gère +212 (MA) et +34 (ES).

3. **Geocode** : L’API geocode utilise `country` pour la région (ma/es).

4. **PDF** : `generatePDFFromData(..., country)` utilise les libellés et la devise selon le pays.

5. **Notifications** : Les messages FCM/WhatsApp/SMS sont traduits selon le pays de la demande.

---

## 7. Tests manuels recommandés

- [ ] Connexion client sur leplombier.es → interface en espagnol, montants en EUR
- [ ] Connexion client sur leplombier.ma → interface en français, montants en MAD
- [ ] Création d’une demande instantanée sur ES → plombiers ES uniquement
- [ ] Codes promo : réduction fixe affichée en EUR sur ES
- [ ] Documents plombier : validation avec pays correct
