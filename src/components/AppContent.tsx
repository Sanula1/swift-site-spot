import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useAuth } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { useContextUrlSync, extractPageFromUrl } from '@/utils/pageNavigation';
import { useRouteContext } from '@/hooks/useRouteContext';
import { useMobilePermissions } from '@/hooks/useMobilePermissions';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building2, BookOpen, GraduationCap, User, Palette, Menu, X, ArrowLeft } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';
import Dashboard from '@/components/Dashboard';
import Users from '@/components/Users';
import Students from '@/components/Students';
import Teachers from '@/components/Teachers';
import Parents from '@/components/Parents';
import ChildAttendance from '@/components/ChildAttendance';
import ChildResults from '@/components/ChildResults';
import VerifyImage from '@/components/VerifyImage';
import ModalRouter from '@/components/ModalRouter';

import Grades from '@/components/Grades';
import Classes from '@/components/Classes';
// Subjects component merged into InstituteSubjects
import ClassSubjects from '@/components/ClassSubjects';
import Institutes from '@/components/Institutes';
import Grading from '@/components/Grading';
import Attendance from '@/components/Attendance';
import NewAttendance from '@/components/NewAttendance';
import MyAttendance from '@/components/MyAttendance';

import AttendanceMarkers from '@/components/AttendanceMarkers';
import QRAttendance from '@/components/QRAttendance';
import RfidAttendance from '@/pages/RFIDAttendance';
import InstituteMarkAttendance from '@/pages/InstituteMarkAttendance';
import Lectures from '@/components/Lectures';
import LiveLectures from '@/components/LiveLectures';
import { HomeworkAccordion } from '@/components/homework';
import Exams from '@/components/Exams';
import Results from '@/components/Results';
import Profile from '@/components/Profile';
import InstituteDetails from '@/components/InstituteDetails';
import Login from '@/components/Login';
import InstituteSelector from '@/components/InstituteSelector';
import ClassSelector from '@/components/ClassSelector';
import SubjectSelector from '@/components/SubjectSelector';
import ParentChildrenSelector from '@/components/ParentChildrenSelector';
import Organizations from '@/components/Organizations';
import Gallery from '@/components/Gallery';
import Settings from '@/components/Settings';
import Appearance from '@/components/Appearance';
import OrganizationHeader from '@/components/OrganizationHeader';
import OrganizationSelector from '@/components/OrganizationSelector';
import CreateOrganizationForm from '@/components/forms/CreateOrganizationForm';
import OrganizationManagement from '@/components/OrganizationManagement';
import OrganizationCourses from '@/components/OrganizationCourses';
import OrganizationLectures from '@/components/OrganizationLectures';
import TeacherStudents from '@/components/TeacherStudents';
import TeacherHomework from '@/components/TeacherHomework';
import TeacherExams from '@/components/TeacherExams';
import TeacherLectures from '@/components/TeacherLectures';
import InstituteLectures from '@/components/InstituteLectures';
import AttendanceMarkerSubjectSelector from '@/components/AttendanceMarkerSubjectSelector';
import UnverifiedStudents from '@/components/UnverifiedStudents';
import EnrollClass from '@/components/EnrollClass';
import EnrollSubject from '@/components/EnrollSubject';
import InstituteUsers from '@/components/InstituteUsers';
import SetupGuide from '@/components/SetupGuide';
import InstituteProfile from '@/components/InstituteProfile';
import StudentHomeworkSubmissions from '@/components/StudentHomeworkSubmissions';
import FreeLectures from '@/components/FreeLectures';
import SMS from '@/components/SMS';
import SMSHistory from '@/pages/SMSHistory';
import MyChildren from '@/pages/MyChildren';
import ChildDashboard from '@/pages/ChildDashboard';
import ChildResultsPage from '@/pages/ChildResultsPage';
import ChildAttendancePage from '@/pages/ChildAttendancePage';
import ChildTransportPage from '@/pages/ChildTransportPage';
import InstituteOrganizations from '@/pages/InstituteOrganizations';
import InstitutePayments from '@/pages/InstitutePayments';
import SubjectPayments from '@/pages/SubjectPayments';
import SubjectSubmissions from '@/pages/SubjectSubmissions';
import SubjectPaymentSubmissions from '@/pages/SubjectPaymentSubmissions';
import MySubmissions from '@/pages/MySubmissions';
import HomeworkSubmissions from '@/pages/HomeworkSubmissions';
import ExamResults from '@/pages/ExamResults';
import CreateExamResults from '@/pages/CreateExamResults';
import InstituteSubjects from '@/pages/InstituteSubjects';
import TeacherEnrollmentManagement from '@/pages/TeacherEnrollmentManagement';
import NotificationsPage from '@/pages/NotificationsPage';

interface AppContentProps {
  initialPage?: string;
}

const AppContent = ({ initialPage }: AppContentProps) => {
  const { user, login, selectedInstitute, selectedClass, selectedSubject, selectedChild, selectedOrganization, setSelectedOrganization, currentInstituteId, isViewingAsParent } = useAuth();
  const { navigateToPage, getPageFromPath } = useAppNavigation();
  const location = useLocation();
  const navigate = useNavigate();
  const [hasNavigatedAfterLogin, setHasNavigatedAfterLogin] = React.useState(false);
  
  // 📱 Mobile permissions hook - handles permission prompts after login on mobile
  const { isRequesting: isRequestingPermissions, permissionStatus } = useMobilePermissions();
  
  // Sync URL context with AuthContext and validate access (403 if unauthorized)
  const { isValidating, instituteId: urlInstituteId } = useRouteContext();
  
  // Institute-specific role - always uses selectedInstitute.userRole
  const userRole = useInstituteRole();
  
  console.log('🎯 AppContent - Role:', userRole, 'Institute UserType:', selectedInstitute?.userRole, 'isValidating:', isValidating);
  
  // Derive current page from URL pathname
  const currentPage = React.useMemo(() => {
    return extractPageFromUrl(location.pathname);
  }, [location.pathname]);
  
  // Check for nested route patterns that need direct component rendering
  const nestedRouteComponent = React.useMemo(() => {
    const path = location.pathname;
    // homework/:id/submissions
    if (/\/homework\/[^\/]+\/submissions/.test(path)) {
      return 'homework-submissions-view';
    }
    // exam/:id/results
    if (/\/exam\/[^\/]+\/results$/.test(path)) {
      return 'exam-results-view';
    }
    // exam/:id/create-results
    if (/\/exam\/[^\/]+\/create-results/.test(path)) {
      return 'exam-create-results';
    }
    // child/:id/select-institute - Parent selecting institute for child
    if (/\/child\/[^\/]+\/select-institute/.test(path)) {
      return 'child-select-institute';
    }
    // child/:id/select-class - Parent selecting class for child
    if (/\/child\/[^\/]+\/select-class/.test(path)) {
      return 'child-select-class';
    }
    // child/:id/select-subject - Parent selecting subject for child
    if (/\/child\/[^\/]+\/select-subject/.test(path)) {
      return 'child-select-subject';
    }
    // child/:id/dashboard - Child dashboard after selecting institute
    if (/\/child\/[^\/]+\/dashboard/.test(path)) {
      return 'child-dashboard';
    }
    // child/:id/child-results
    if (/\/child\/[^\/]+\/child-results/.test(path)) {
      return 'child-results';
    }
    // child/:id/child-attendance or child/:id/attendance
    if (/\/child\/[^\/]+\/(child-)?attendance/.test(path)) {
      return 'child-attendance';
    }
    // child/:id/child-transport
    if (/\/child\/[^\/]+\/child-transport/.test(path)) {
      return 'child-transport';
    }
    // child/:id/homework - Parent viewing child's homework
    if (/\/child\/[^\/]+\/homework/.test(path)) {
      return 'child-homework';
    }
    // child/:id/lectures - Parent viewing child's lectures
    if (/\/child\/[^\/]+\/lectures/.test(path)) {
      return 'child-lectures';
    }
    // child/:id/exams - Parent viewing child's exams
    if (/\/child\/[^\/]+\/exams/.test(path)) {
      return 'child-exams';
    }
    // child/:id/results - Parent viewing child's results
    if (/\/child\/[^\/]+\/results/.test(path)) {
      return 'child-results-page';
    }
    return null;
  }, [location.pathname]);
  
  // 🔗 Sync URL with context automatically
  useContextUrlSync(currentPage);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Check if we're loading context from URL (direct navigation)
  const isLoadingContextFromUrl = urlInstituteId && !selectedInstitute && isValidating;
  
  // Auto-navigate to Select Institute page after login (only if not loading from URL)
  React.useEffect(() => {
    // Don't auto-navigate if we have an institute ID in URL (direct navigation)
    if (urlInstituteId) {
      console.log('🔗 Direct URL navigation detected, waiting for context to load...');
      return;
    }
    
    if (user && !hasNavigatedAfterLogin && !selectedInstitute && (location.pathname === '/dashboard' || location.pathname === '/')) {
      console.log('🏢 Auto-navigating to Select Institute after login');
      setHasNavigatedAfterLogin(true);
      navigate('/select-institute');
    }
  }, [user, hasNavigatedAfterLogin, selectedInstitute, location.pathname, navigate, urlInstituteId]);
  
  // Reset the flag when user logs out and navigate to root
  React.useEffect(() => {
    if (!user) {
      setHasNavigatedAfterLogin(false);
      // Navigate to root (login page) when user logs out
      if (location.pathname !== '/') {
        navigate('/', { replace: true });
      }
    }
  }, [user, location.pathname, navigate]);
  const [showCreateOrgForm, setShowCreateOrgForm] = useState(false);
  const [organizationCurrentPage, setOrganizationCurrentPage] = useState('organizations');

  const setCurrentPage = (page: string) => {
    navigateToPage(page);
  };

  const handleMenuClick = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSidebarClose = () => {
    setIsSidebarOpen(false);
  };

  const handleOrganizationSelect = (organization: any) => {
    console.log('Organization selected:', organization);
    setSelectedOrganization(organization);
    
    // Switch to using baseUrl2 for organization-specific API calls
    import('@/api/client').then(({ apiClient }) => {
      apiClient.setUseBaseUrl2(true);
    });
    
    setCurrentPage('dashboard');
  };

  const handleBackToOrganizationSelector = () => {
    setCurrentPage('organization-selector');
  };

  const handleBackToMain = () => {
    setOrganizationCurrentPage('organizations');
    setSelectedOrganization(null);
    
    // Switch back to using baseUrl for main API calls
    import('@/api/client').then(({ apiClient }) => {
      apiClient.setUseBaseUrl2(false);
    });
    
    navigateToPage('dashboard');
  };

  const handleCreateOrganization = () => {
    setShowCreateOrgForm(true);
  };

  const handleCreateOrganizationSuccess = (organization: any) => {
    console.log('Organization created successfully:', organization);
    setShowCreateOrgForm(false);
    setCurrentPage('organization-selector');
  };

  const handleCreateOrganizationCancel = () => {
    setShowCreateOrgForm(false);
  };

  // Organization-specific navigation component
  const OrganizationNavigation = () => {
    const isOrganizationManager = userRole === 'OrganizationManager';
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    const navigationItems = [
      {
        id: 'organizations',
        title: 'Select Organizations',
        description: 'Browse and manage organizations',
        icon: Building2,
        visible: true
      },
      {
        id: 'courses',
        title: 'Courses',
        description: 'Manage course content',
        icon: BookOpen,
        visible: isOrganizationManager
      },
      {
        id: 'lectures',
        title: 'Lectures',
        description: 'Schedule and view lectures',
        icon: GraduationCap,
        visible: isOrganizationManager
      },
      {
        id: 'profile',
        title: 'Profile',
        description: 'Manage your profile',
        icon: User,
        visible: true
      },
      {
        id: 'appearance',
        title: 'Appearance',
        description: 'Customize app appearance',
        icon: Palette,
        visible: true
      }
    ];

    const handleNavigation = (pageId: string) => {
      setOrganizationCurrentPage(pageId);
      setIsSidebarOpen(false); // Close mobile sidebar after navigation
    };

    const SidebarSection = ({ title, items }: { title: string; items: any[] }) => {
      if (items.length === 0) return null;

      return (
        <div className="mb-4 sm:mb-6">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
            {title}
          </h3>
          <div className="space-y-1">
            {items.map((item) => (
              <Button
                key={item.id}
                variant={organizationCurrentPage === item.id ? "secondary" : "ghost"}
                className={`w-full justify-start h-9 sm:h-10 px-3 text-sm ${
                  organizationCurrentPage === item.id 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500' 
                    : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                }`}
                onClick={() => handleNavigation(item.id)}
              >
                <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                {item.title}
              </Button>
            ))}
          </div>
        </div>
      );
    };
    
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Mobile Header */}
        <div className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-4">
            <h2 className="font-bold text-lg text-gray-900 dark:text-white">Organization Portal</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleBackToMain}>
                Back
              </Button>
            </div>
          </div>
        </div>

        <div className="flex w-full min-h-screen">
          {/* Mobile Overlay */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Organization Sidebar */}
          <div className={`
            fixed inset-y-0 left-0 z-50 md:relative
            w-72 sm:w-80 md:w-64 lg:w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
            transform transition-transform duration-300 ease-in-out md:transform-none
            ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            flex flex-col h-screen
            overflow-hidden
          `}>
            {/* Header */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border">
              <div className="flex items-center space-x-2 min-w-0">
                <Building2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 flex-shrink-0" />
                <span className="font-bold text-base sm:text-lg text-foreground truncate">
                  Organization
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSidebarOpen(false)}
                  className="h-8 w-8 p-0 hover:bg-muted"
                  aria-label="Close Sidebar"
                >
                  <X className="h-4 w-4 md:hidden" />
                  <Menu className="h-4 w-4 hidden md:block" />
                </Button>
              </div>
            </div>

            {/* Context Info */}
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  Management Hub
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToMain}
                  className="h-6 w-6 p-0 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800"
                  aria-label="Back to Main"
                >
                  <ArrowLeft className="h-3 w-3" />
                </Button>
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                <span className="font-medium">Module:</span> 
                <span className="ml-1 truncate">Organization System</span>
              </div>
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 px-2 sm:px-3 py-3 sm:py-4">
              <div className="space-y-2">
                {/* Main navigation items */}
                <SidebarSection title="Quick Access" items={navigationItems.filter(item => item.visible)} />
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToMain}
                className="w-full flex items-center justify-center gap-2 text-sm hover:bg-muted h-8 sm:h-9"
              >
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">Back to Main</span>
              </Button>
            </div>
          </div>
          
          {/* Organization Content */}
          <div className="flex-1 overflow-auto">
            {/* Content Wrapper with responsive padding */}
            <div className="p-4 sm:p-6 lg:p-8 max-w-full">
              {organizationCurrentPage === 'organizations' && (
                <OrganizationManagement
                  userRole={userRole || 'Student'}
                  userPermissions={undefined}
                  currentInstituteId={currentInstituteId || undefined}
                />
              )}
              {organizationCurrentPage === 'courses' && isOrganizationManager && (
                <OrganizationCourses />
              )}
              {organizationCurrentPage === 'lectures' && isOrganizationManager && (
                <OrganizationLectures />
              )}
              {organizationCurrentPage === 'profile' && <Profile />}
              {organizationCurrentPage === 'appearance' && <Appearance />}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderComponent = () => {
    // CRITICAL: Show loading state when loading context from direct URL navigation
    if (isLoadingContextFromUrl) {
      return (
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Loading institute data...</p>
          </div>
        </div>
      );
    }
    
    // CRITICAL: Handle parent viewing child routes FIRST - regardless of user role
    // When isViewingAsParent is true and child is selected, show student UI in view-only mode
    if (isViewingAsParent && selectedChild && nestedRouteComponent) {
      // Child institute selection
      if (nestedRouteComponent === 'child-select-institute') {
        return <InstituteSelector useChildId={true} />;
      }
      // Child class selection
      if (nestedRouteComponent === 'child-select-class') {
        return <ClassSelector />;
      }
      // Child subject selection
      if (nestedRouteComponent === 'child-select-subject') {
        return <SubjectSelector />;
      }
      // Child dashboard (after selecting institute)
      if (nestedRouteComponent === 'child-dashboard') {
        return <Dashboard />;
      }
      // Child homework (view-only - isViewingAsParent checked in component)
      if (nestedRouteComponent === 'child-homework') {
        return <HomeworkAccordion />;
      }
      // Child lectures (view-only)
      if (nestedRouteComponent === 'child-lectures') {
        return <Lectures />;
      }
      // Child exams (view-only)
      if (nestedRouteComponent === 'child-exams') {
        return <Exams />;
      }
      // Child results page
      if (nestedRouteComponent === 'child-results-page') {
        return <Results />;
      }
      // Legacy child routes
      if (nestedRouteComponent === 'child-results') return <ChildResults />;
      if (nestedRouteComponent === 'child-attendance') return <ChildAttendancePage />;
      if (nestedRouteComponent === 'child-transport') return <ChildTransportPage />;
    }
    
    // Non-parent-viewing child routes
    if (selectedChild && nestedRouteComponent) {
      if (nestedRouteComponent === 'child-results') return <ChildResults />;
      if (nestedRouteComponent === 'child-attendance') return <ChildAttendancePage />;
      if (nestedRouteComponent === 'child-transport') return <ChildTransportPage />;
    }
    
    // Handle organization-related pages
    if (currentPage === 'organizations') {
      if (showCreateOrgForm) {
        return (
          <CreateOrganizationForm
            onSuccess={handleCreateOrganizationSuccess}
            onCancel={handleCreateOrganizationCancel}
          />
        );
      }
      
      if (!selectedOrganization) {
        return (
          <OrganizationSelector
            onOrganizationSelect={handleOrganizationSelect}
            onBack={handleBackToMain}
            onCreateOrganization={handleCreateOrganization}
            userPermissions={undefined}
          />
        );
      }
    }

    if (currentPage === 'organization-selector') {
      return (
        <OrganizationSelector
          onOrganizationSelect={handleOrganizationSelect}
          onBack={handleBackToMain}
          onCreateOrganization={handleCreateOrganization}
          userPermissions={undefined}
        />
      );
    }

    // For Organization Manager - show organizations list or organization-specific dashboard
    if (userRole === 'OrganizationManager') {
      if (!selectedOrganization && currentPage !== 'organizations') {
        return <Organizations />;
      }

      // Add Organization Header for specific sections
      const shouldShowOrgHeader = ['dashboard', 'students', 'lectures', 'gallery'].includes(currentPage);
      
      const getPageTitle = () => {
        switch (currentPage) {
          case 'dashboard': return 'Dashboard';
          case 'students': return 'Students';
          case 'lectures': return 'Lectures';
          case 'gallery': return 'Gallery';
          default: return 'Management';
        }
      };

      const renderWithHeader = (component: React.ReactNode) => (
        <>
          {shouldShowOrgHeader && <OrganizationHeader title={getPageTitle()} />}
          {component}
        </>
      );

      switch (currentPage) {
        case 'organizations':
          return <Organizations />;
        case 'dashboard':
          return renderWithHeader(<Dashboard />);
        case 'students':
          return renderWithHeader(<Students />);
        case 'lectures':
          return renderWithHeader(<Lectures />);
        case 'gallery':
          return renderWithHeader(<Gallery />);
        case 'appearance':
          return <Appearance />;
        case 'profile':
          return <Profile />;
        case 'settings':
          return <Settings />;
        case 'notifications':
        case 'institute-notifications':
          return <NotificationsPage />;
        default:
          return <Dashboard />;
      }
    }

    // For Student role - simplified interface
    if (userRole === 'Student') {
      // Handle nested routes first for Student role
      if (nestedRouteComponent === 'exam-results-view') return <ExamResults />;
      if (nestedRouteComponent === 'homework-submissions-view') return <HomeworkSubmissions />;
      
      if (!selectedInstitute && user.institutes.length === 1) {
        // Auto-select the only institute available
        // This should be handled by the auth context
      }
      
      // Only redirect to InstituteSelector if no institute AND not loading from URL
      if (!selectedInstitute && !urlInstituteId && currentPage !== 'institutes' && currentPage !== 'select-institute') {
        return <InstituteSelector />;
      }

      switch (currentPage) {
        case 'dashboard':
          return <Dashboard />;
        case 'select-class':
          return <ClassSelector />;
        case 'select-subject':
          return <SubjectSelector />;
        case 'enroll-class':
          console.log('Student: Rendering EnrollClass component');
          return <EnrollClass />;
        case 'enroll-subject':
          console.log('Student: Rendering EnrollSubject component');
          return <EnrollSubject />;
        case 'my-attendance':
          console.log('Student: Rendering MyAttendance component');
          return <MyAttendance />;
        case 'students':
          return <Students />;
        case 'lectures':
          return <Lectures />;
        case 'free-lectures':
          return <FreeLectures />;
        case 'homework':
          return <HomeworkAccordion />;
        case 'homework-submissions':
          return <StudentHomeworkSubmissions />;
        case 'exams':
          return <Exams />;
        case 'results':
          return <Results />;
        case 'institute-lectures':
          console.log('Student: Rendering InstituteLectures component');
          return <InstituteLectures />;
        case 'profile':
          return <Profile />;
        case 'select-institute':
          return <InstituteSelector />;
        case 'appearance':
          return <Appearance />;
        case 'institute-profile':
          return <InstituteProfile />;
        case 'organizations':
          return renderComponent();
        case 'institute-payments':
          return <InstitutePayments />;
        case 'subject-payments':
          return <SubjectPayments />;
        case 'subject-submissions':
          return <SubjectSubmissions />;
        case 'my-submissions':
          return <MySubmissions />;
        case 'subject-pay-submission':
          return <SubjectPaymentSubmissions />;
        case 'my-children':
          return <MyChildren />;
        case 'notifications':
        case 'institute-notifications':
          return <NotificationsPage />;
        default:
          return <Dashboard />;
      }
    }

    // For Parent role
    if (userRole === 'Parent') {
      // Handle nested child routes first
      if (nestedRouteComponent === 'child-results') return <ChildResults />;
      if (nestedRouteComponent === 'child-attendance') return <ChildAttendancePage />;
      if (nestedRouteComponent === 'child-transport') return <ChildTransportPage />;

      if (currentPage === 'parents') {
        return <ParentChildrenSelector />;
      }

      if (!selectedChild && currentPage !== 'parents' && currentPage !== 'profile' && currentPage !== 'appearance') {
        return <ParentChildrenSelector />;
      }

      // For Parent role, when "Select Institute" is clicked (dashboard page), 
      // use InstituteSelector but pass the selected child's ID
      if (currentPage === 'dashboard' && selectedChild && !selectedInstitute && !urlInstituteId) {
        return <InstituteSelector useChildId={true} />;
      }

      switch (currentPage) {
        case 'dashboard':
          return <Dashboard />;
        case 'attendance':
          return <Attendance />;
        case 'homework':
          return <HomeworkAccordion />;
        case 'homework-submissions':
          return <StudentHomeworkSubmissions />;
        case 'results':
          return <Results />;
        case 'exams':
          return <Exams />;
        case 'profile':
          return <Profile />;
        case 'child-attendance':
          return <ChildAttendance />;
        case 'child-results':
          return <ChildResults />;
        case 'child-transport':
          return <ChildTransportPage />;
        case 'my-children':
          return <ParentChildrenSelector />;
        case 'parents':
          return <ParentChildrenSelector />;
        case 'appearance':
          return <Appearance />;
        case 'notifications':
        case 'institute-notifications':
          return <NotificationsPage />;
        default:
          return <ParentChildrenSelector />;
      }
    }

    // For Teacher role
    if (userRole === 'Teacher') {
      // Only redirect to InstituteSelector if no institute AND not loading from URL
      if (!selectedInstitute && !urlInstituteId && currentPage !== 'institutes' && currentPage !== 'select-institute') {
        return <InstituteSelector />;
      }

      if (currentPage === 'select-class') {
        return <ClassSelector />;
      }

      if (currentPage === 'select-subject') {
        return <SubjectSelector />;
      }

      const classRequiredPages = ['grading'];
      if (selectedInstitute && !selectedClass && classRequiredPages.includes(currentPage)) {
        return <ClassSelector />;
      }

      const subjectRequiredPages = ['lectures'];
      if (selectedClass && !selectedSubject && subjectRequiredPages.includes(currentPage)) {
        return <SubjectSelector />;
      }

      // Handle nested routes first
      if (nestedRouteComponent === 'homework-submissions-view') return <HomeworkSubmissions />;
      if (nestedRouteComponent === 'exam-results-view') return <ExamResults />;
      if (nestedRouteComponent === 'exam-create-results') return <CreateExamResults />;

      switch (currentPage) {
        case 'dashboard':
          return <Dashboard />;
        case 'students':
          return <Students />;
        case 'unverified-students':
          return <UnverifiedStudents />;
        case 'parents':
          return <Parents />;
        case 'classes':
          return <Classes />;
        case 'subjects':
        case 'institute-subjects':
          return <InstituteSubjects />;
        case 'class-subjects':
          return <ClassSubjects />;
        case 'select-institute':
          return <InstituteSelector />;
        case 'grading':
        case 'grades-table':
        case 'create-grade':
        case 'assign-grade-classes':
        case 'view-grade-classes':
          return <Grading />;
        case 'attendance':
          return <Attendance />;
        case 'daily-attendance':
          return <NewAttendance />;
        case 'qr-attendance':
          return <QRAttendance />;
        case 'institute-mark-attendance':
          return <InstituteMarkAttendance />;
        case 'lectures':
          return userRole === 'Teacher' ? <TeacherLectures /> : <Lectures />;
        case 'institute-lectures':
          return <InstituteLectures />;
        case 'free-lectures':
          return <FreeLectures />;
        case 'live-lectures':
          return <LiveLectures />;
        case 'homework':
          return <HomeworkAccordion />;
        case 'homework-submissions':
          return <StudentHomeworkSubmissions />;
        case 'exams':
          return userRole === 'Teacher' ? <TeacherExams /> : <Exams />;
        case 'results':
          return <Results />;
        case 'profile':
          return <Profile />;
        case 'appearance':
          return <Appearance />;
        case 'institute-profile':
          return <InstituteProfile />;
        case 'institute-payments':
          return <InstitutePayments />;
        case 'subject-payments':
          return <SubjectPayments />;
        case 'subject-submissions':
          return <SubjectSubmissions />;
        case 'my-submissions':
          return <MySubmissions />;
        case 'subject-pay-submission':
          return <SubjectPaymentSubmissions />;
        case 'enrollment-management':
          return <TeacherEnrollmentManagement />;
        case 'notifications':
        case 'institute-notifications':
          return <NotificationsPage />;
        default:
          return <Dashboard />;
      }
    }

    // For AttendanceMarker role
    if (userRole === 'AttendanceMarker') {
      // Only redirect to InstituteSelector if no institute AND not loading from URL
      if (!selectedInstitute && !urlInstituteId && currentPage !== 'select-institute') {
        return <InstituteSelector />;
      }

      if (currentPage === 'select-class') {
        return <ClassSelector />;
      }

      if (currentPage === 'select-subject') {
        return <SubjectSelector />;
      }

      switch (currentPage) {
        case 'dashboard':
          return <Dashboard />;
        case 'attendance':
          return <Attendance />;
        case 'daily-attendance':
          return <NewAttendance />;
        case 'my-attendance':
          return <MyAttendance />;
        case 'attendance-markers':
          return <AttendanceMarkers />;
      case 'qr-attendance':
        return <QRAttendance />;
      case 'rfid-attendance':
        return <RfidAttendance />;
      case 'institute-mark-attendance':
        return <InstituteMarkAttendance />;
        case 'profile':
          return <Profile />;
        case 'select-institute':
          return <InstituteSelector />;
        case 'select-class':
          return <ClassSelector />;
      case 'appearance':
        return <Appearance />;
      case 'institute-profile':
        return <InstituteProfile />;
      case 'settings':
          return <Settings />;
      case 'notifications':
      case 'institute-notifications':
        return <NotificationsPage />;
        default:
          return <Dashboard />;
      }
    }

    // For InstituteAdmin and other roles - full access within their institute
    // Pages that don't require class/subject selection
    const pagesWithoutClassRequirement = [
      'profile',
      'transport', 
      'parent-transport', 
      'transport-selection', 
      'transport-attendance',
      'my-children',
      'child/:childId/dashboard',
      'child/:childId/results',
      'child/:childId/attendance',
      'child/:childId/transport',
      'institute-payments',
      'subject-payments',
      'my-submissions',
      'notifications',
      'institute-notifications'
    ];
    
    console.log('🔍 Student Role - Debug:', { 
      currentPage, 
      selectedInstitute: !!selectedInstitute,
      isInExceptionList: pagesWithoutClassRequirement.includes(currentPage)
    });
    
    // Only redirect to institute selector if institute is not selected AND not loading from URL AND page is not in exception list
    if (!selectedInstitute && !urlInstituteId && currentPage !== 'institutes' && currentPage !== 'select-institute' && currentPage !== 'organizations' && !pagesWithoutClassRequirement.includes(currentPage)) {
      console.log('❌ Redirecting to InstituteSelector');
      return <InstituteSelector />;
    }

    // NEVER redirect to class selector for pages that don't need it
    if (currentPage === 'select-class' && !pagesWithoutClassRequirement.includes(currentPage)) {
      return <ClassSelector />;
    }

    if (currentPage === 'select-subject') {
      return <SubjectSelector />;
    }

    // ONLY show class selector for pages that explicitly require a class
    // AND are NOT in the exception list
    if (!pagesWithoutClassRequirement.includes(currentPage)) {
      const classRequiredPages = ['grading'];
      if (selectedInstitute && !selectedClass && classRequiredPages.includes(currentPage)) {
        console.log('❌ Redirecting to ClassSelector for class-required page');
        return <ClassSelector />;
      }
    }

    const subjectRequiredPages = ['lectures'];
    if (selectedClass && !selectedSubject && subjectRequiredPages.includes(currentPage) && !pagesWithoutClassRequirement.includes(currentPage)) {
      return <SubjectSelector />;
    }

    // Handle nested routes first
    if (nestedRouteComponent === 'homework-submissions-view') return <HomeworkSubmissions />;
    if (nestedRouteComponent === 'exam-results-view') return <ExamResults />;
    if (nestedRouteComponent === 'exam-create-results') return <CreateExamResults />;

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'institute-users':
        return <InstituteUsers />;
      case 'verify-image':
        return <VerifyImage />;
      case 'users':
        // Show InstituteUsers for InstituteAdmin
        if (userRole === 'InstituteAdmin') {
          return <InstituteUsers />;
        }
        return <Users />;
      case 'students':
         return <Students />;
      case 'unverified-students':
        return <UnverifiedStudents />;
      case 'enroll-class':
        console.log('Rendering EnrollClass component for Student');
        return <EnrollClass />;
      case 'enroll-subject':
        console.log('Rendering EnrollSubject component for Student');
        return <EnrollSubject />;
      case 'teachers':
        return <Teachers />;
      case 'parents':
        return <Parents />;
      case 'grades':
        return <Grades />;
      case 'classes':
        return <Classes />;
      case 'subjects':
      case 'institute-subjects':
        return <InstituteSubjects />;
      case 'class-subjects':
        return <ClassSubjects />;
      case 'institutes':
        return <Institutes />;
      case 'institute-organizations':
        return <InstituteOrganizations />;
      case 'select-institute':
        return <InstituteSelector />;
      case 'grading':
      case 'grades-table':
      case 'create-grade':
      case 'assign-grade-classes':
      case 'view-grade-classes':
        return <Grading />;
      case 'attendance':
        return <Attendance />;
      case 'daily-attendance':
        return <NewAttendance />;
      case 'attendance-markers':
        return <AttendanceMarkers />;
      case 'qr-attendance':
        return <QRAttendance />;
      case 'rfid-attendance':
        return <RfidAttendance />;
      case 'institute-mark-attendance':
        return <InstituteMarkAttendance />;
      case 'lectures':
        return <Lectures />;
      case 'free-lectures':
        return <FreeLectures />;
      case 'institute-lectures':
        return <InstituteLectures />;
      case 'live-lectures':
        return <LiveLectures />;
      case 'homework':
        return <HomeworkAccordion />;
      case 'homework-submissions':
        return <StudentHomeworkSubmissions />;
      case 'exams':
        return <Exams />;
      case 'results':
        return <Results />;
      case 'teacher-students':
        return <TeacherStudents />;
      case 'teacher-homework':
        return <TeacherHomework />;
      case 'teacher-exams':
        return <TeacherExams />;
      case 'teacher-lectures':
        return <TeacherLectures />;
      case 'profile':
        return <Profile />;
      case 'settings':
        return <Settings />;
      case 'setup-guide':
        return <SetupGuide />;
      case 'institute-details':
        return <InstituteDetails />;
      case 'appearance':
        return <Appearance />;
      case 'institute-profile':
        return <InstituteProfile />;
      case 'sms':
        return <SMS />;
      case 'sms-history':
        return <SMSHistory />;
      case 'notifications':
      case 'institute-notifications':
        return <NotificationsPage />;
      case 'institute-payments':
        return <InstitutePayments />;
      case 'subject-payments':
        return <SubjectPayments />;
      case 'my-submissions':
        return <MySubmissions />;
      case 'subject-pay-submission':
        return <SubjectPaymentSubmissions />;
      case 'enrollment-management':
        return <TeacherEnrollmentManagement />;
      case 'my-children':
        return <MyChildren />;
      case 'child/:childId/dashboard':
        return <ChildDashboard />;
      case 'child/:childId/results':
        return <ChildResultsPage />;
      case 'child/:childId/attendance':
        return <ChildAttendancePage />;
      case 'child/:childId/transport':
        return <ChildTransportPage />;
      default:
        return <Dashboard />;
    }
  };

  if (!user) {
    return <Login onLogin={(userData) => {
      // Login success is handled by the auth context
      console.log('User logged in successfully:', userData);
    }} loginFunction={login} />;
  }

  // 🛡️ CRITICAL: Show loading state while validating context from URL
  // This MUST happen BEFORE any institute/class/subject checks
  if (isValidating) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading context from URL...</p>
        </div>
      </div>
    );
  }

  // If organizations page is active, render full screen
  if (currentPage === 'organizations' && !selectedOrganization) {
    return renderComponent();
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="flex w-full h-screen">
        <Sidebar 
          isOpen={isSidebarOpen}
          onClose={handleSidebarClose}
        />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <Header onMenuClick={handleMenuClick} />
          <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6">
            <div className="max-w-full">
              {renderComponent()}
            </div>
          </main>
          <ModalRouter />
        </div>
      </div>
    </div>
  );
};

export default AppContent;
