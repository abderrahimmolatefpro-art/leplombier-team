# Blocs Espace Client pour WordPress Elementor

Trois blocs HTML à ajouter sur votre page WordPress (Elementor) pour encourager les visiteurs à se connecter et commander un plombier.

**Important** : L'iframe sert uniquement à créer un compte ou se connecter. Une fois connecté, l'utilisateur est redirigé vers le dashboard complet (dash.leplombier.ma) pour commander, consulter ses documents, etc.

## Ordre recommandé

1. **Bloc 2** (explication) en premier – les visiteurs comprennent le concept
2. **Bloc 3** (démo interactive) – simulation du flux client-plombier, puis inscription et création d'une vraie demande
3. **Bloc 1** (iframe connexion) – alternative directe pour se connecter sans passer par la démo

---

## Bloc 1 : Iframe (création de compte / connexion)

L'iframe affiche uniquement le formulaire de connexion. Après connexion, l'utilisateur est redirigé vers le dashboard complet sur dash.leplombier.ma (commander, documents, etc.).

À coller dans un **widget HTML** Elementor.

```html
<!-- Style seamless : pas de boîte, pas d'ombre, le formulaire se fond dans la page -->
<div class="crm-iframe-block" style="max-width: 420px; margin: 0 auto 30px;">
  <iframe 
    src="https://dash.leplombier.ma/espace-client/login?embed=1&next=/espace-client/commander" 
    style="width: 100%; height: 380px; border: none; display: block;"
    title="Espace Client Le Plombier"
  ></iframe>
</div>
```

---

## Bloc 2 : Explication du concept

À coller dans un **widget HTML** Elementor.

```html
<div class="crm-explain-block" style="max-width: 700px; margin: 0 auto; padding: 24px; background: #f0f9ff; border-radius: 12px; border-left: 4px solid #0284c7;">
  <h4 style="margin: 0 0 16px; color: #0369a1; font-size: 1.1rem;">Comment ça marche ?</h4>
  <ul style="margin: 0; padding-left: 20px; line-height: 1.8; color: #334155;">
    <li><strong>Vous proposez votre prix</strong> : décrivez votre besoin, les plombiers vous envoient leurs offres</li>
    <li><strong>Vous choisissez le plombier</strong> qui vous convient le mieux</li>
    <li><strong>Intervention rapide</strong> : tout se fait en quelques clics, sans prise de tête</li>
    <li><strong>Tous vos documents et commandes</strong> sont enregistrés dans votre espace client : factures, devis, historique. Rien ne se perd.</li>
  </ul>
  <p style="margin: 16px 0 0; font-size: 0.95rem; color: #64748b;">
    Connectez-vous ci-dessus pour commencer. Nouveau ? Entrez votre numéro, recevez un code par SMS et c'est parti.
  </p>
</div>
```

---

## Bloc 3 : Démo interactive (simulation + inscription)

Widget qui simule le flux complet : le visiteur décrit son besoin, voit une offre plombier simulée, accepte, puis se connecte (téléphone + SMS). Une **vraie** demande est créée et les plombiers reçoivent une notification. Redirection vers le dashboard pour suivre la demande en temps réel.

À coller dans un **widget HTML** Elementor.

```html
<div class="crm-demo-block" style="max-width: 480px; margin: 0 auto 30px;">
  <iframe 
    src="https://dash.leplombier.ma/espace-client/demo?embed=1" 
    style="width: 100%; min-height: 500px; border: none; display: block;"
    title="Démo Le Plombier"
  ></iframe>
</div>
```

---

## Instructions

1. Dans Elementor, ajoutez **trois widgets HTML** sur votre page
2. Collez le **Bloc 2** (explication) dans le premier widget
3. Collez le **Bloc 3** (démo) dans le second widget
4. Collez le **Bloc 1** (iframe connexion) dans le troisième widget
5. Ajustez l'ordre si besoin

## Prérequis

- Le site WordPress doit être sur `leplombier.ma` ou `www.leplombier.ma` pour que l'iframe s'affiche (autorisation `frame-ancestors` côté CRM)
- Le CRM doit être déployé sur `dash.leplombier.ma`

## Look seamless (sans effet iframe)

Le formulaire en mode embed est conçu pour se fondre dans la page :
- Fond transparent (le fond de votre page WordPress reste visible)
- Pas de carte blanche, pas d'ombre, pas de bordure
- Champs avec fond semi-transparent qui s'adaptent au contexte
- Hauteur réduite (380px) pour un bloc compact

Si votre page a un fond coloré (ex. dégradé bleu clair), le formulaire s'y intégrera naturellement.
