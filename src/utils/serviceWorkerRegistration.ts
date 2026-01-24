// src/utils/serviceWorkerRegistration.ts
import { Capacitor } from '@capacitor/core';

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Check if Firebase is configured
const isFirebaseConfigured = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.messagingSenderId &&
  firebaseConfig.appId
);

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  // Don't register service worker on native platforms - they use native push
  if (Capacitor.isNativePlatform()) {
    console.log('Native platform detected - skipping web service worker registration');
    return null;
  }

  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported in this browser');
    return null;
  }

  if (!isFirebaseConfigured) {
    console.warn('Firebase not configured - skipping service worker registration for push notifications');
    return null;
  }

  try {
    // Pass Firebase config via URL parameter for service worker initialization
    const configParam = encodeURIComponent(JSON.stringify(firebaseConfig));
    const swUrl = `/firebase-messaging-sw.js?firebaseConfig=${configParam}`;
    
    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: '/'
    });
    console.log('Service Worker registered successfully:', registration);

    // Also send config via message (more reliable)
    if (registration.active) {
      registration.active.postMessage({
        type: 'FIREBASE_CONFIG',
        config: firebaseConfig
      });
    }

    // Send config when service worker becomes active
    navigator.serviceWorker.ready.then((reg) => {
      if (reg.active) {
        reg.active.postMessage({
          type: 'FIREBASE_CONFIG',
          config: firebaseConfig
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

export async function unregisterServiceWorker(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const result = await registration.unregister();
    console.log('Service Worker unregistered:', result);
    return result;
  } catch (error) {
    console.error('Service Worker unregistration failed:', error);
    return false;
  }
}
