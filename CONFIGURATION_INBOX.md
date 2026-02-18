# Configuration de la boîte mail contact@leplombier.ma

## Vue d'ensemble

Le dashboard admin affiche les derniers emails de la boîte **contact@leplombier.ma** via IMAP. Cette fonctionnalité permet de consulter les messages entrants directement depuis le CRM.

## Variables d'environnement

Ajoutez ces variables dans `.env.local` (développement) et dans Vercel (production) :

| Variable | Valeur | Description |
|----------|--------|-------------|
| `IMAP_INBOX_HOST` | `premium239.web-hosting.com` | Serveur IMAP cPanel (même serveur que le webmail) |
| `IMAP_INBOX_PORT` | `993` | Port IMAP (SSL) |
| `IMAP_INBOX_USER` | `contact@leplombier.ma` | Identifiant |
| `IMAP_INBOX_PASS` | *mot de passe du compte* | Mot de passe de la boîte mail |

### Configuration recommandée (SSL/TLS)

D’après les paramètres fournis par votre hébergeur :

- **Serveur entrant** : leplombier.ma
- **Port IMAP** : 993 (SSL)
- **Authentification** : requise

## Exemple .env.local (cPanel / premium239.web-hosting.com)

```env
# Réception (IMAP)
IMAP_INBOX_HOST=premium239.web-hosting.com
IMAP_INBOX_PORT=993
IMAP_INBOX_USER=contact@leplombier.ma
IMAP_INBOX_PASS=votre_mot_de_passe

# Envoi (SMTP) — requis pour envoyer depuis la Boîte mail
SMTP_HOST=premium239.web-hosting.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=contact@leplombier.ma
SMTP_PASS=votre_mot_de_passe
SMTP_FROM=contact@leplombier.ma

NEXT_PUBLIC_WEBMAIL_URL=https://premium239.web-hosting.com:2096/3rdparty/roundcube/
```

## Lien webmail (optionnel)

Pour le lien « Ouvrir la boîte mail » dans le dashboard, vous pouvez définir :

```env
NEXT_PUBLIC_WEBMAIL_URL=https://mail.leplombier.ma
```

Si non défini, `https://mail.leplombier.ma` est utilisé par défaut.

## Sécurité

- Ne commitez jamais `IMAP_INBOX_PASS` dans le dépôt
- Utilisez les variables d'environnement Vercel pour la production
- Seuls les utilisateurs avec le rôle **admin** peuvent accéder à la boîte mail
