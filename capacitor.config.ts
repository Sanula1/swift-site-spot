import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'lk.suraksha.lms',
  appName: 'Suraksha LMS',
  webDir: 'dist',
  // For development with live reload:
  server: {
    url: 'http://192.168.56.1:8080',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidScaleType: "CENTER_CROP",
      showSpinner: false
    },
    PushNotifications: {
      // Android: presentationOptions determine how notifications appear when app is in foreground
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;