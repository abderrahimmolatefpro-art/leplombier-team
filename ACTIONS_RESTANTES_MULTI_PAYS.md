# Actions restantes — Multi-pays Maroc / Espagne

Liste des tâches à accomplir pour finaliser le déploiement multi-pays (leplombier.ma → leplombier.es).

---

## 1. Vercel — Déploiement Espagne

### 1.1 Créer le projet dash.leplombier.es

| Étape | Action |
|-------|--------|
| 1 | Vercel → **Add New Project** (ou dupliquer le projet MA) |
| 2 | Connecter le même repo GitHub |
| 3 | **Domains** : ajouter `dash.leplombier.es` et `www.dash.leplombier.es` |
| 4 | **Environment Variables** : copier toutes les variables du projet MA |
| 5 | **Variable spécifique ES** : `NEXT_PUBLIC_ACTIVE_COUNTRY` = `ES` |
| 6 | Déployer |

### 1.2 DNS

- Créer un enregistrement **CNAME** : `dash` → `cname.vercel-dns.com` (ou l’URL fournie par Vercel)
- Vérifier que le domaine pointe bien vers le projet Vercel ES

---

## 2. Firebase

### 2.1 Index Firestore

Déployer les index (dont `recruitments` si pas encore fait) :

```bash
firebase deploy --only firestore:indexes
```

### 2.2 Règles Firestore

Vérifier que les règles autorisent bien les requêtes avec `country` (déjà en place).

---

## 3. i18n — Traduction espace client & plombier

### 3.1 Installation

```bash
npm install next-intl
```

### 3.2 Fichiers à créer

- `messages/fr.json` — chaînes françaises (espace client + plombier)
- `messages/es.json` — chaînes espagnoles

### 3.3 Configuration

- Provider `next-intl` dans `app/espace-client/layout.tsx` et `app/espace-plombier/layout.tsx`
- Détection locale : `NEXT_PUBLIC_ACTIVE_COUNTRY === 'ES'` → `es`, sinon `fr`
- Remplacer les textes en dur par `t('client.xxx')` ou `t('plumber.xxx')`

### 3.4 Traduction initiale

- Utiliser une API (DeepL, Google Translate, etc.) pour générer `es.json` à partir de `fr.json`
- Revoir manuellement les termes métier (plomberie, dépannage, etc.)

---

## 4. Compléments fonctionnels

### 4.1 PDF (factures, devis)

**Fichier :** `lib/pdfGenerator.ts`

- Libellés ES : `FACTURA` au lieu de `FACTURE`, `PRESUPUESTO` au lieu de `DEVIS`
- Devise : EUR pour ES, MAD pour MA
- Passer `country` ou `companyInfo` depuis `getCompanyInfo(country)`

### 4.2 Notifications (FCM, WhatsApp, SMS)

**Fichiers :** `lib/notify.ts`, `lib/whatsapp.ts`

- Messages push : traduire selon le pays
- Templates WhatsApp : versions ES (ex. `demande_service_recibida`)
- Messages SMS : traduire selon langue du client

### 4.3 Réponses API

**Fichiers :** `app/api/espace-client/verify/route.ts`, `send-code/route.ts`, etc.

- Messages d’erreur ("Numéro non reconnu", "Code incorrect") : traduire ou retourner des codes + traduction côté front

### 4.4 Setup premier admin

**Fichier :** `app/setup/page.tsx`

- Champ `country` ou déduction du domaine (`dash.leplombier.es` → ES)

### 4.5 Messages automatiques

**Fichier :** `app/messages-automatiques/page.tsx`

- Modèles promo/warning : versions ES ou champ `language` par template

---

## 5. Documentation

### 5.1 WORDPRESS_ESPACE_CLIENT.md

- Ajouter une section **Version Espagne**
- URLs : `dash.leplombier.es`, `https://dash.leplombier.es/espace-client/login?embed=1`
- Prérequis : site WordPress sur `leplombier.es` ou `www.leplombier.es`

### 5.2 Formulaires HTML

**Fichiers :** `FORMULAIRE_SIMPLE_AVEC_CRM.html`, `FORMULAIRE_COMPLET_AVEC_CRM.html`, `FORMULAIRE_RECRUTEMENT.html`, `WORDPRESS_FORM_SIMPLE.html`

- Documenter pour ES : URL `dash.leplombier.es`, `country: 'ES'` dans le body
- Google Places : `componentRestrictions: { country: "es" }`

### 5.3 Guides

- `GUIDE_INTEGRATION_WORDPRESS.md` : note MA vs ES
- `GUIDE_FORMULAIRE_RECRUTEMENT.md` : paramètre `country` du webhook
- `CONFIGURATION_WEBHOOK.md` : paramètre `country` du webhook

---

## 6. Optionnel (basse priorité)

| Point | Action |
|-------|--------|
| **Fournisseurs** | Champ `country` sur Supplier si fournisseurs MA/ES distincts |
| **Infobip** | Variables `INFOBIP_SENDER_ES`, `INFOBIP_WHATSAPP_SENDER_ES` si numéros différents |
| **Metadata / SEO** | `lang="es"` dans le layout pour dash.leplombier.es |
| **Apps mobiles** | Build ES avec `url: 'https://dash.leplombier.es/espace-client'` |

---

## 7. Checklist rapide avant mise en production ES

- [ ] Projet Vercel `dash.leplombier.es` créé et déployé
- [ ] Variable `NEXT_PUBLIC_ACTIVE_COUNTRY=ES` configurée
- [ ] Domaine `dash.leplombier.es` pointant vers Vercel
- [ ] Index Firestore déployés
- [ ] CSP `frame-ancestors` inclut `leplombier.es` (déjà fait dans `next.config.js`)
- [ ] i18n configuré (ou au minimum interface en français pour l’instant)
- [ ] Test de connexion espace client sur dash.leplombier.es
- [ ] Test de création de demande instantanée (country ES)
- [ ] Test de connexion espace plombier sur dash.leplombier.es

---

## 8. Ordre recommandé

1. **Vercel** : créer le projet ES et configurer le domaine
2. **Firebase** : déployer les index Firestore
3. **Tests** : vérifier que le flux client/plombier fonctionne sur dash.leplombier.es
4. **i18n** : installer et configurer next-intl
5. **PDF** : adapter les libellés et la devise pour ES
6. **Notifications** : traduire les messages
7. **Documentation** : mettre à jour les guides
