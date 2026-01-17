import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'lk.suraksha.lms',
  appName: 'Suraksha LMS',
  webDir: 'dist',
  server: {
    url: 'https://lms.suraksha.lk',
    cleartext: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;