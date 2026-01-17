import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, Users, BookOpen, Camera, Presentation, Link, Upload, Image as ImageIcon, Settings, UserX, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Organization, organizationSpecificApi } from '@/api/organization.api';
import OrganizationGallery from './OrganizationGallery';
import OrganizationCourses from './OrganizationCourses';
import OrganizationCourseLectures from './OrganizationCourseLectures';
import OrganizationStudents from './OrganizationStudents';
import OrganizationUnverifiedMembers from './OrganizationUnverifiedMembers';
import AssignInstituteDialog from './AssignInstituteDialog';
import UpdateOrganizationDialog from './forms/UpdateOrganizationDialog';
interface OrganizationDetailsProps {
  organization: Organization;
  userRole: string;
  onBack: () => void;
}
type NavigationTab = 'gallery' | 'courses' | 'lectures' | 'members' | 'unverified';
const OrganizationDetails = ({
  organization,
  userRole,
  onBack
}: OrganizationDetailsProps) => {
  // Use organization-specific role if available, fallback to general userRole
  const effectiveUserRole = organization.userRole || userRole;
  const [activeTab, setActiveTab] = useState<NavigationTab>('gallery');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const {
    toast
  } = useToast();

  // Define navigation tabs based on user role
  const getNavigationTabs = () => {
    const commonTabs = [{
      id: 'gallery' as NavigationTab,
      label: 'Gallery',
      icon: Camera
    }, {
      id: 'courses' as NavigationTab,
      label: 'Courses',
      icon: BookOpen
    }];
    if (userRole === 'OrganizationManager') {
      return [...commonTabs, {
        id: 'lectures' as NavigationTab,
        label: 'Lectures',
        icon: Presentation
      }, {
        id: 'members' as NavigationTab,
        label: 'Members',
        icon: Users
      }, {
        id: 'unverified' as NavigationTab,
        label: 'Unverified Members',
        icon: UserX
      }];
    }

    // Add Members tab for ADMIN/PRESIDENT users
    if (effectiveUserRole === 'ADMIN' || effectiveUserRole === 'PRESIDENT') {
      return [...commonTabs, {
        id: 'lectures' as NavigationTab,
        label: 'Lectures',
        icon: Presentation
      }, {
        id: 'members' as NavigationTab,
        label: 'Members',
        icon: Users
      }, {
        id: 'unverified' as NavigationTab,
        label: 'Unverified Members',
        icon: UserX
      }];
    }
    return commonTabs;
  };
  const handleCourseSelect = (course: any) => {
    setSelectedCourse(course);
    setActiveTab('lectures');
  };
  const handleBackToCourses = () => {
    setSelectedCourse(null);
    setActiveTab('courses');
  };

  const handleLeaveOrganization = async () => {
    try {
      await organizationSpecificApi.delete(`/organization/api/v1/organizations/${organization.organizationId}/leave`);
      
      toast({
        title: "Success",
        description: "You have successfully left the organization",
      });
      
      // Go back to organizations list
      onBack();
    } catch (error) {
      console.error('Error leaving organization:', error);
      toast({
        title: "Error",
        description: "Failed to leave organization",
        variant: "destructive",
      });
    }
  };
  const renderContent = () => {
    if (activeTab === 'lectures' && selectedCourse) {
      return <OrganizationCourseLectures course={selectedCourse} onBack={handleBackToCourses} organization={organization} />;
    }
    switch (activeTab) {
      case 'gallery':
        return <OrganizationGallery organizationId={organization.organizationId} />;
      case 'courses':
        // Only render if this tab is active to avoid expensive API calls on initial load
        return activeTab === 'courses' ? <OrganizationCourses organizationId={organization.organizationId} onSelectCourse={handleCourseSelect} organization={organization} /> : null;
      case 'lectures':
        return <OrganizationCourseLectures course={null} onBack={() => {}} organization={organization} />;
      case 'members':
        // Only render if this tab is active to avoid expensive API calls on initial load
        return activeTab === 'members' ? <OrganizationStudents organizationId={organization.organizationId} userRole={effectiveUserRole} /> : null;
      case 'unverified':
        // Only render if this tab is active to avoid expensive API calls on initial load
        return activeTab === 'unverified' ? <OrganizationUnverifiedMembers organizationId={organization.organizationId} userRole={effectiveUserRole} /> : null;
      default:
        return <OrganizationGallery organizationId={organization.organizationId} />;
    }
  };
  const navigationTabs = getNavigationTabs();
  return <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <Button variant="outline" onClick={onBack} className="w-fit">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Building2 className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              {organization.name}
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              {userRole === 'OrganizationManager' || effectiveUserRole === 'ADMIN' || effectiveUserRole === 'PRESIDENT' ? 'Manage organization details and content' : 'View organization content'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 flex-wrap">
          {/* Leave Organization Button for MEMBER role only */}
          {effectiveUserRole === 'MEMBER' && (
            <Button 
              onClick={handleLeaveOrganization} 
              variant="destructive"
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <LogOut className="h-4 w-4" />
              Leave Organization
            </Button>
          )}
          
          {/* Assign to Institute Button for OrganizationManager */}
          {userRole === 'OrganizationManager' && <Button onClick={() => setShowAssignDialog(true)} className="flex items-center gap-2 w-full sm:w-auto">
              <Link className="h-4 w-4" />
              Assign to Institute
            </Button>}
          
          {/* Update Organization Button for PRESIDENT users only */}
          {effectiveUserRole === 'PRESIDENT' && <Button onClick={() => setShowUpdateDialog(true)} className="flex items-center gap-2 w-full sm:w-auto">
              <Settings className="h-4 w-4" />
              Update Organization
            </Button>}
        </div>
      </div>

      {/* Image Upload Section */}
      

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b overflow-x-auto">
        {navigationTabs.map(tab => {
        const IconComponent = tab.icon;
        return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-3 sm:px-4 sm:py-2 whitespace-nowrap border-b-2 transition-colors text-base sm:text-base ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}>
              <IconComponent className="h-6 w-6 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>;
      })}
      </div>

      {/* Content */}
      <div>
        {renderContent()}
      </div>

      {/* Assign Institute Dialog */}
      <AssignInstituteDialog open={showAssignDialog} onOpenChange={setShowAssignDialog} organizationId={organization.organizationId} />

      {/* Update Organization Dialog */}
      <UpdateOrganizationDialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog} organization={organization} onUpdate={updatedOrg => {
      // Handle organization update if needed
      toast({
        title: "Success",
        description: "Organization updated successfully"
      });
    }} />
    </div>;
};
export default OrganizationDetails;