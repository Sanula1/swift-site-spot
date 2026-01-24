// src/pages/NotificationsPage.tsx
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  SystemNotifications, 
  InstituteNotifications, 
  NotificationManagement 
} from '@/components/notifications';
import { Bell, Building2, Settings } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Notifications Page
 * - Before institute selection: Shows System/Global Notifications
 * - After institute selection: Shows Institute Notifications + Admin Management
 */
const NotificationsPage: React.FC = () => {
  const { selectedInstitute, user } = useAuth();
  const [activeTab, setActiveTab] = useState('notifications');
  
  const isSuperAdmin = user?.userType === 'SUPERADMIN' || user?.userType === 'SA';
  
  // Check for both formats: INSTITUTEADMIN and INSTITUTE_ADMIN (API returns underscore format)
  const instituteUserType = selectedInstitute?.instituteUserType || selectedInstitute?.userRole;
  const isInstituteAdmin = instituteUserType === 'INSTITUTEADMIN' || instituteUserType === 'INSTITUTE_ADMIN';
  const isTeacher = instituteUserType === 'TEACHER';
  
  // Determine if user can manage notifications (Admin/Teacher)
  const canManageNotifications = selectedInstitute && (
    isInstituteAdmin || isTeacher || isSuperAdmin
  );

  // Before institute selection - show system notifications
  if (!selectedInstitute) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          </div>
        </div>
        
        <p className="text-muted-foreground">
          Stay updated with system-wide announcements and important updates.
        </p>
        
        <SystemNotifications />
      </div>
    );
  }

  // After institute selection - show tabbed view with notifications and management
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary flex-shrink-0" />
          <h1 className="text-lg sm:text-2xl font-bold text-foreground">Institute Notifications</h1>
        </div>
      </div>
      
      <p className="text-sm sm:text-base text-muted-foreground">
        View announcements and updates from {selectedInstitute.name || 'your institute'}.
      </p>
      
      {canManageNotifications ? (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="notifications" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="truncate">View</span>
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
            <TabsTrigger value="manage" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3">
              <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="truncate">Manage</span>
              <span className="hidden sm:inline">Notifications</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="notifications" className="mt-4">
            <InstituteNotifications 
              instituteId={selectedInstitute.id}
              instituteName={selectedInstitute.name}
            />
          </TabsContent>
          
          <TabsContent value="manage" className="mt-4">
            <NotificationManagement instituteId={selectedInstitute.id} />
          </TabsContent>
        </Tabs>
      ) : (
        <InstituteNotifications 
          instituteId={selectedInstitute.id}
          instituteName={selectedInstitute.name}
        />
      )}
    </div>
  );
};

export default NotificationsPage;
