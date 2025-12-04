import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.7830ef91388147a796a758e3de0ca280',
  appName: 'laas-admin-forge',
  webDir: 'dist',
  server: {
    url: 'https://7830ef91-3881-47a7-96a7-58e3de0ca280.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;