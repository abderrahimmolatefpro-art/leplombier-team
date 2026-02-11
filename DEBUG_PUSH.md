# Debug des notifications push

## 1. Vérifier le token FCM

Sur l’émulateur / téléphone :

1. Ouvrir l’app **Espace Plombier**
2. Se connecter
3. Ouvrir **Chrome** (ou le navigateur) et aller sur `chrome://inspect`
4. Ou lancer l’app depuis le terminal :

```bash
cd mobile-plombier
npx cap run android
```

Regarder les logs dans le terminal. Tu devrais voir :
- `[FCM Plombier] Token reçu, envoi au serveur...`
- `[FCM Plombier] register-fcm-token: 200 OK`

Si tu vois `[FCM Plombier] Pas Capacitor ou PushNotifications absent`, l’app n’est pas reconnue comme native (problème de configuration Capacitor).

## 2. Vérifier Firestore

1. Firebase Console → **Firestore Database**
2. Collection **users** → document du plombier (son uid)
3. Vérifier qu’il existe un champ **`fcmToken`** avec une longue chaîne

Si `fcmToken` est absent, le token n’a pas été enregistré par l’app.

## 3. Vérifier les logs Vercel

1. Vercel → ton projet → **Deployments** → dernier déploiement
2. **Functions** → logs
3. Quand tu crées une demande instantanée, tu devrais voir :
   - `[FCM] instant-request: plombiers disponibles: [{id: "...", hasFcm: true/false}]`
   - `[FCM] sendPushToPlombier OK: ...` ou `[FCM] sendPushToPlombier: pas de fcmToken pour plombier ...`

## 4. Checklist

- [ ] Emulateur avec **Google Play** (image système avec Play Store)
- [ ] Plombier connecté sur l’app mobile
- [ ] Plombier **disponible** sur « Interventions instantanées »
- [ ] `fcmToken` présent dans Firestore pour ce plombier
- [ ] `google-services.json` dans `mobile-plombier/android/app/` et `mobile-client/android/app/`

## 5. Test sur téléphone physique

Si l’émulateur ne reçoit pas les notifications, tester sur un vrai téléphone Android :

1. Connecter le téléphone en USB
2. Activer le débogage USB
3. `npx cap run android` → sélectionner le téléphone
