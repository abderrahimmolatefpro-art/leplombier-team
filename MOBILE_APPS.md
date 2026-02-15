# Applications mobiles (Capacitor)

Deux apps Capacitor qui chargent les espaces web existants dans une WebView native.

## Structure

- **mobile-plombier** : App pour les plombiers (login, dashboard, instant, planning, projets, revenus)
- **mobile-client** : App pour les clients (login SMS, commander, commandes, documents)

Chaque app charge l'URL de production : `https://leplombier-team.vercel.app`

## Changer l'URL de l'app

Si votre déploiement est sur un autre domaine (ex. domaine personnalisé), modifiez le fichier `web/index.html` dans chaque projet :

```javascript
// mobile-plombier/web/index.html et mobile-client/web/index.html
var url = 'https://VOTRE-DOMAINE.com/espace-plombier';  // ou /espace-client
```

## Prérequis

- **Android** : Android Studio + SDK
- **iOS** : Xcode + CocoaPods (`sudo gem install cocoapods`)

## Commandes

### Espace Plombier

```bash
cd mobile-plombier
npm install
npx cap sync
npx cap open android   # Ouvre Android Studio
npx cap open ios       # Ouvre Xcode (macOS uniquement)
```

### Espace Client

```bash
cd mobile-client
npm install
npx cap sync
npx cap open android
npx cap open ios
```

## Build de production

### Android
1. Ouvrir le projet dans Android Studio : `npx cap open android`
2. Build → Generate Signed Bundle / APK
3. Ou pour un APK debug : Build → Build Bundle(s) / APK(s) → Build APK(s)

### iOS
1. Ouvrir le projet dans Xcode : `npx cap open ios`
2. Sélectionner un appareil ou simulateur
3. Product → Archive (pour distribution)

## Notifications push

Les apps enregistrent automatiquement le token FCM quand l'utilisateur est connecté. Pour activer les push :

1. Dans Firebase Console : **Project Settings > General** > ajoutez une app Android (package : `com.leplombier.plombier` pour plombier, `com.leplombier.client` pour client)
2. Téléchargez `google-services.json` et placez-le dans :
   - `mobile-plombier/android/app/google-services.json`
   - `mobile-client/android/app/google-services.json`
3. Faites `npx cap sync` dans chaque projet

## Téléchargement APK plombier

La page `/app-plombier` permet aux plombiers de télécharger l'app Android. Pour activer le téléchargement :

1. **Construire l'APK** : Dans Android Studio (mobile-plombier), Build → Build Bundle(s) / APK(s) → Build APK(s). L'APK se trouve dans `mobile-plombier/android/app/build/outputs/apk/debug/` (ou release).

2. **Option A – Fichier local** : Copiez l'APK dans `public/app-plombier-android.apk`. Le lien de téléchargement fonctionnera automatiquement.

3. **Option B – URL externe** : Hébergez l'APK ailleurs (Firebase Storage, GitHub Releases, etc.) et définissez la variable d'environnement :
   ```
   NEXT_PUBLIC_APP_PLOMBIER_APK_URL=https://votre-url.com/leplombier-plombier.apk
   ```

## Notes

- Les apps chargent le site web en direct via `server.url` (config Capacitor).
- La géolocalisation (suivi plombier) fonctionne dans la WebView.
- Pour tester en local : déployez sur Vercel ou utilisez un tunnel (ngrok) pointant vers `localhost:3000`.
