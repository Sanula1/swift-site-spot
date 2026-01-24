// src/config/firebase.ts
import { initializeApp, FirebaseApp } from "firebase/app";
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";
import { Capacitor } from '@capacitor/core';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Check if Firebase config is properly set
const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId
);

// Initialize Firebase only if configured
let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

// Only initialize Firebase messaging on web browsers, not on native Capacitor apps
// Native apps will use Capacitor Push Notifications plugin instead
const isNativePlatform = Capacitor.isNativePlatform();

if (isFirebaseConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    
    if (!isNativePlatform && typeof window !== 'undefined' && 'Notification' in window) {
      messaging = getMessaging(app);
      console.log('Firebase Web Messaging initialized');
    } else if (isNativePlatform) {
      console.log('Native platform detected - using Capacitor Push Notifications instead of Firebase Web');
    }
  } catch (error) {
    console.warn('Firebase initialization failed:', error);
  }
} else {
  console.warn('Firebase not configured. Set VITE_FIREBASE_* environment variables for web push notifications.');
}

// VAPID key for web push from environment variable
export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

export { app, messaging, getToken, onMessage, isNativePlatform, isFirebaseConfigured };
