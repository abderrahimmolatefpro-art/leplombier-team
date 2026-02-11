import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.leplombier.client',
  appName: 'Le Plombier - Espace Client',
  webDir: 'web',
  server: {
    // Charge l'URL directement dans l'app (reste dans l'app, pas Chrome)
    url: 'https://leplombier-team.vercel.app/espace-client',
  },
};

export default config;
