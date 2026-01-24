// src/components/notifications/InstituteNotifications.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, RefreshCw, Building2 } from 'lucide-react';
import { notificationApiService, Notification } from '@/services/notificationApiService';
import { NotificationItem } from './NotificationItem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';

interface InstituteNotificationsProps {
  instituteId: string;
  instituteName?: string;
}

type FilterScope = 'ALL' | 'INSTITUTE' | 'CLASS' | 'SUBJECT';

/**
 * Institute Notifications Component
 * Shows INSTITUTE, CLASS, and SUBJECT scope notifications
 * when user has selected an institute
 */
export const InstituteNotifications: React.FC<InstituteNotificationsProps> = ({
  instituteId,
  instituteName,
}) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<FilterScope>('ALL');

  const loadNotifications = useCallback(async () => {
    if (!instituteId) return;
    
    try {
      setLoading(true);
      const result = await notificationApiService.getInstituteNotifications(
        instituteId,
        {
          page,
          limit: 10,
          scope: filter !== 'ALL' ? filter : undefined
        }
      );
      setNotifications(result.data || []);
      setTotalPages(result.totalPages || 1);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notifications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [instituteId, page, filter]);

  const loadUnreadCount = useCallback(async () => {
    if (!instituteId) return;
    
    try {
      const result = await notificationApiService.getInstituteUnreadCount(instituteId);
      setUnreadCount(result.unreadCount || 0);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  }, [instituteId]);

  // Only load on explicit user action (refresh button, pagination, filter change)
  // NOT automatically on mount - user must click refresh to load
  const [initialized, setInitialized] = useState(false);
  
  // Load only when page or filter changes AFTER initial load
  useEffect(() => {
    if (initialized) {
      loadNotifications();
      loadUnreadCount();
    }
  }, [page, filter]);
  
  // Handle initial refresh click
  const handleRefresh = () => {
    if (!initialized) setInitialized(true);
    loadNotifications();
    loadUnreadCount();
  };

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

  const handleMarkAllAsRead = async () => {
    if (!instituteId) return;
    
    try {
      await notificationApiService.markAllAsRead(instituteId);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark all as read',
        variant: 'destructive',
      });
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  // handleRefresh is now defined above with the initialized state

  const handleFilterChange = (value: string) => {
    setFilter(value as FilterScope);
    setPage(1);
  };

  // Show prompt to load if not initialized
  if (!initialized) {
    return (
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
            <CardTitle className="flex items-center gap-1 sm:gap-2 text-base sm:text-lg">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              Institute Notifications
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="text-xs sm:text-sm h-8 sm:h-9"
            >
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Load Notifications
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
          <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
            <Bell className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50 mb-3 sm:mb-4" />
            <p className="text-sm sm:text-base text-muted-foreground">
              Click "Load Notifications" to view your notifications
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading && notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Institute Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-full bg-muted rounded" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-3 sm:space-y-4 p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <CardTitle className="flex items-center gap-1 sm:gap-2 text-base sm:text-lg">
              <Building2 className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="truncate">Institute Notifications</span>
            </CardTitle>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">{unreadCount} unread</Badge>
            )}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className="h-8 w-8 p-0 sm:h-9 sm:w-9"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3"
              >
                <CheckCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Mark all read</span>
                <span className="sm:hidden">Read all</span>
              </Button>
            )}
          </div>
        </div>

        {instituteName && (
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{instituteName}</p>
        )}

        {/* Filter Tabs */}
        <Tabs value={filter} onValueChange={handleFilterChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-8 sm:h-10">
            <TabsTrigger value="ALL" className="text-xs sm:text-sm px-1 sm:px-3">All</TabsTrigger>
            <TabsTrigger value="INSTITUTE" className="text-xs sm:text-sm px-1 sm:px-3">
              <span className="hidden sm:inline">Institute</span>
              <span className="sm:hidden">Inst.</span>
            </TabsTrigger>
            <TabsTrigger value="CLASS" className="text-xs sm:text-sm px-1 sm:px-3">Class</TabsTrigger>
            <TabsTrigger value="SUBJECT" className="text-xs sm:text-sm px-1 sm:px-3">
              <span className="hidden sm:inline">Subject</span>
              <span className="sm:hidden">Subj.</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="p-0">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {filter === 'ALL' 
                ? 'No notifications for this institute' 
                : `No ${filter.toLowerCase()} notifications`}
            </p>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
