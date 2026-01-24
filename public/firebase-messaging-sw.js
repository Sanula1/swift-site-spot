// public/firebase-messaging-sw.js
// Firebase Messaging Service Worker for background notifications (Web only)
// Note: This service worker is only used in web browsers, not in native Capacitor apps

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase config will be injected at runtime via message from main app
// This allows us to avoid hardcoding sensitive values
let firebaseInitialized = false;

// Listen for config message from main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    if (!firebaseInitialized) {
      try {
        firebase.initializeApp(event.data.config);
        firebaseInitialized = true;
        console.log('[firebase-messaging-sw.js] Firebase initialized with config from main app');
        initializeMessaging();
      } catch (error) {
        console.error('[firebase-messaging-sw.js] Firebase initialization failed:', error);
      }
    }
  }
});

// Fallback: Try to initialize with config from query params (set during registration)
// This is a backup method if message passing fails
const urlParams = new URL(self.location).searchParams;
const configParam = urlParams.get('firebaseConfig');
if (configParam && !firebaseInitialized) {
  try {
    const config = JSON.parse(decodeURIComponent(configParam));
    firebase.initializeApp(config);
    firebaseInitialized = true;
    console.log('[firebase-messaging-sw.js] Firebase initialized from URL params');
    initializeMessaging();
  } catch (error) {
    console.warn('[firebase-messaging-sw.js] Could not parse Firebase config from URL:', error);
  }
}

function initializeMessaging() {
  const messaging = firebase.messaging();

  // Handle background messages
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Background message received:', payload);
    
    const notificationTitle = payload.notification?.title || 'New Notification';
    const notificationOptions = {
      body: payload.notification?.body || '',
      icon: payload.notification?.icon || '/favicon.png',
      badge: '/favicon.png',
      image: payload.notification?.image,
      data: payload.data,
      tag: payload.data?.notificationId || 'default',
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);
  
  event.notification.close();
  
  const actionUrl = event.notification.data?.actionUrl || '/notifications';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (const client of windowClients) {
        if (client.url === actionUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(actionUrl);
      }
    })
  );
});
