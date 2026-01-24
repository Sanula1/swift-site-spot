// src/hooks/usePushNotifications.ts
import { useEffect, useState, useCallback } from 'react';
import { pushNotificationService, NotificationPayload } from '../services/pushNotificationService';
import { useAuth } from '@/contexts/AuthContext';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [latestNotification, setLatestNotification] = useState<NotificationPayload | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default');

  // Check permission status on mount
  useEffect(() => {
    const checkPermission = async () => {
      const status = await pushNotificationService.getPermissionStatus();
      setPermissionStatus(status);
    };
    checkPermission();
  }, []);

  // Register push token when user is logged in
  useEffect(() => {
    if (!user?.id) {
      setIsRegistered(false);
      return;
    }

    const registerToken = async () => {
      try {
        const result = await pushNotificationService.registerToken(user.id);
        if (result) {
          setIsRegistered(true);
          setPermissionStatus('granted');
          console.log(`✅ Push notifications registered successfully (${pushNotificationService.getPlatform()})`);
        }
      } catch (error) {
        console.error('Failed to register push notifications:', error);
      }
    };

    // Only register if permission is granted or default (will prompt)
    if (permissionStatus !== 'denied' && permissionStatus !== 'unsupported') {
      registerToken();
    }
  }, [user?.id, permissionStatus]);

  // Listen for foreground messages
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = pushNotificationService.onForegroundMessage((payload) => {
      console.log('📬 New notification received:', payload);
      setLatestNotification(payload);
      setShowToast(true);

      // Auto-hide toast after 5 seconds
      setTimeout(() => setShowToast(false), 5000);
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id]);

  // Listen for notification clicks (native)
  useEffect(() => {
    if (!user?.id || !pushNotificationService.isNative()) return;

    const unsubscribe = pushNotificationService.onNotificationClick((payload) => {
      console.log('📱 Notification clicked:', payload);
      if (payload.data?.actionUrl) {
        window.location.href = payload.data.actionUrl;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user?.id]);

  const dismissToast = useCallback(() => {
    setShowToast(false);
  }, []);

  const handleNotificationClick = useCallback(() => {
    if (latestNotification?.data?.actionUrl) {
      window.location.href = latestNotification.data.actionUrl;
    }
    dismissToast();
  }, [latestNotification, dismissToast]);

  const requestPermission = useCallback(async () => {
    const granted = await pushNotificationService.requestPermission();
    setPermissionStatus(granted ? 'granted' : 'denied');
    return granted;
  }, []);

  return {
    latestNotification,
    showToast,
    dismissToast,
    handleNotificationClick,
    isRegistered,
    permissionStatus,
    requestPermission,
    isSupported: pushNotificationService.isSupported(),
    isNative: pushNotificationService.isNative(),
    platform: pushNotificationService.getPlatform()
  };
};
