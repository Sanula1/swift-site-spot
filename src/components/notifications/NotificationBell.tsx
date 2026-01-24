// src/components/notifications/NotificationBell.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { notificationApiService, Notification } from '@/services/notificationApiService';
import { NotificationItem } from './NotificationItem';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NotificationBellProps {
  instituteId?: string;
  className?: string;
}

/**
 * Notification Bell Component for Header
 * Shows unread count and quick preview of notifications
 */
export const NotificationBell: React.FC<NotificationBellProps> = ({
  instituteId,
  className,
}) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  // DISABLED: Unread count API calls commented out to reduce unnecessary API costs
  // These calls were polling every 30 seconds which is expensive and not needed for basic display
  // The notification count will only update when user explicitly opens the bell
  // const loadUnreadCount = useCallback(async () => {
  //   try {
  //     if (instituteId) {
  //       const result = await notificationApiService.getInstituteUnreadCount(instituteId);
  //       setUnreadCount(result.unreadCount || 0);
  //     } else {
  //       const result = await notificationApiService.getSystemUnreadCount();
  //       setUnreadCount(result.unreadCount || 0);
  //     }
  //   } catch (error) {
  //     console.error('Failed to load unread count:', error);
  //   }
  // }, [instituteId]);

  const loadRecentNotifications = useCallback(async () => {
    try {
      setLoading(true);
      if (instituteId) {
        const result = await notificationApiService.getInstituteNotifications(
          instituteId,
          { page: 1, limit: 5 }
        );
        setNotifications(result.data || []);
        // Update unread count from the fetched data instead of separate API call
        setUnreadCount(result.data?.filter(n => !n.isRead).length || 0);
      } else {
        const result = await notificationApiService.getSystemNotifications({
          page: 1,
          limit: 5
        });
        setNotifications(result.data || []);
        // Update unread count from the fetched data instead of separate API call
        setUnreadCount(result.data?.filter(n => !n.isRead).length || 0);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [instituteId]);

  // DISABLED: Polling removed to save API costs
  // Unread count will be calculated from notifications when user opens the bell
  // useEffect(() => {
  //   loadUnreadCount();
  //   // Poll for new notifications every 30 seconds
  //   const interval = setInterval(loadUnreadCount, 30000);
  //   return () => clearInterval(interval);
  // }, [loadUnreadCount]);

  // Load notifications only when bell is opened (cost-effective approach)
  useEffect(() => {
    if (open) {
      loadRecentNotifications();
    }
  }, [open, loadRecentNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationApiService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    setOpen(false);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const handleViewAll = () => {
    setOpen(false);
    navigate(instituteId ? `/institute/${instituteId}/notifications` : '/notifications');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold">
            {instituteId ? 'Institute Notifications' : 'Notifications'}
          </h4>
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} new</Badge>
          )}
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onClick={handleNotificationClick}
                />
              ))}
            </div>
          )}
        </div>

        <div className="border-t p-2">
          <Button
            variant="ghost"
            className="w-full"
            onClick={handleViewAll}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
