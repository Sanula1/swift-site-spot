// src/components/notifications/NotificationItem.tsx
import React from 'react';
import { Bell, AlertCircle, Info, AlertTriangle, Megaphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Notification } from '@/services/notificationApiService';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onClick?: (notification: Notification) => void;
}

const priorityColors = {
  LOW: 'bg-muted text-muted-foreground',
  NORMAL: 'bg-primary/10 text-primary',
  HIGH: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  URGENT: 'bg-destructive/10 text-destructive',
};

const scopeColors = {
  GLOBAL: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  INSTITUTE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  CLASS: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  SUBJECT: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

const PriorityIcon = ({ priority }: { priority: Notification['priority'] }) => {
  switch (priority) {
    case 'URGENT':
      return <AlertCircle className="h-5 w-5 text-destructive" />;
    case 'HIGH':
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    case 'NORMAL':
      return <Bell className="h-5 w-5 text-primary" />;
    case 'LOW':
    default:
      return <Info className="h-5 w-5 text-muted-foreground" />;
  }
};

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onClick,
}) => {
  const handleClick = () => {
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    if (onClick) {
      onClick(notification);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'flex gap-2 sm:gap-3 p-3 sm:p-4 cursor-pointer transition-colors border-b last:border-b-0',
        notification.isRead
          ? 'bg-background hover:bg-muted/50'
          : 'bg-primary/5 hover:bg-primary/10'
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5 sm:mt-1">
        {notification.icon ? (
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-muted flex items-center justify-center">
            <Megaphone className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
        ) : (
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-muted flex items-center justify-center">
            <PriorityIcon priority={notification.priority} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-1 sm:gap-2">
          <h4 className={cn(
            'text-xs sm:text-sm font-medium line-clamp-2 sm:line-clamp-1',
            !notification.isRead && 'font-semibold'
          )}>
            {notification.title}
          </h4>
          {!notification.isRead && (
            <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-primary flex-shrink-0 mt-1 sm:mt-1.5" />
          )}
        </div>
        
        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-0.5 sm:mt-1">
          {notification.body}
        </p>

        {/* Meta info */}
        <div className="flex items-center gap-1 sm:gap-2 mt-1.5 sm:mt-2 flex-wrap">
          <Badge variant="secondary" className={cn('text-[10px] sm:text-xs px-1 sm:px-2 py-0 sm:py-0.5', scopeColors[notification.scope])}>
            {notification.scope}
          </Badge>
          
          {notification.priority !== 'NORMAL' && (
            <Badge variant="secondary" className={cn('text-[10px] sm:text-xs px-1 sm:px-2 py-0 sm:py-0.5', priorityColors[notification.priority])}>
              {notification.priority}
            </Badge>
          )}

          {notification.targetClassName && (
            <span className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[80px] sm:max-w-none">
              {notification.targetClassName}
            </span>
          )}

          {notification.targetSubjectName && (
            <span className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[60px] sm:max-w-none">
              • {notification.targetSubjectName}
            </span>
          )}

          <span className="text-[10px] sm:text-xs text-muted-foreground ml-auto flex-shrink-0">
            {formatDate(notification.createdAt)}
          </span>
        </div>

        {notification.senderName && (
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">
            From: {notification.senderName}
          </p>
        )}
      </div>
    </div>
  );
};
