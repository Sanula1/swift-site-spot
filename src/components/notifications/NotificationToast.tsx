// src/components/notifications/NotificationToast.tsx
import React from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { X, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

export const NotificationToast: React.FC = () => {
  const { latestNotification, showToast, dismissToast, handleNotificationClick } = usePushNotifications();

  if (!showToast || !latestNotification) return null;

  const notification = latestNotification.notification;
  const data = latestNotification.data;

  return (
    <div 
      className={cn(
        "fixed top-4 right-4 z-[100] max-w-sm w-full",
        "animate-in slide-in-from-top-2 fade-in duration-300"
      )}
    >
      <div 
        className={cn(
          "bg-card border border-border rounded-lg shadow-lg p-4 cursor-pointer",
          "hover:shadow-xl transition-shadow",
          "flex items-start gap-3"
        )}
        onClick={handleNotificationClick}
      >
        {/* Icon */}
        <div className="flex-shrink-0">
          {notification?.icon ? (
            <img 
              src={notification.icon} 
              alt="" 
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground text-sm line-clamp-1">
            {notification?.title || 'New Notification'}
          </p>
          <p className="text-muted-foreground text-sm mt-0.5 line-clamp-2">
            {notification?.body}
          </p>
          {data?.actionUrl && (
            <p className="text-primary text-xs mt-1">
              Click to view
            </p>
          )}
        </div>

        {/* Close button */}
        <button 
          className="flex-shrink-0 p-1 hover:bg-muted rounded-full transition-colors"
          onClick={(e) => { 
            e.stopPropagation(); 
            dismissToast(); 
          }}
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Optional image preview */}
      {notification?.image && (
        <div className="mt-2 rounded-lg overflow-hidden">
          <img 
            src={notification.image} 
            alt="" 
            className="w-full h-32 object-cover"
          />
        </div>
      )}
    </div>
  );
};
