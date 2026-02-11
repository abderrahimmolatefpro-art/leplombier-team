import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.leplombier.plombier',
  appName: 'Le Plombier - Espace Plombier',
  webDir: 'web',
  server: {
    // Charge l'URL directement dans l'app (reste dans l'app, pas Chrome)
    url: 'https://leplombier-team.vercel.app/espace-plombier',
  },
};

export default config;
