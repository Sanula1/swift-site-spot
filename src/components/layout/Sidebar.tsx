import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { extractPageFromUrl, buildSidebarUrl, getSidebarHighlightPage } from '@/utils/pageNavigation';
import { AccessControl } from '@/utils/permissions';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  UserCheck,
  BookOpen,
  School,
  ClipboardList,
  BarChart3,
  Settings,
  User,
  Building2,
  QrCode,
  X,
  Award,
  Video,
  LogOut,
  Menu,
  FileText,
  ArrowLeft,
  Notebook,
  Images,
  Palette,
  CreditCard,
  Camera,
  AlertCircle,
  Truck,
  ImageIcon,
  IdCard,
  MessageSquare,
  Wifi,
  Lock,
  Bell
} from 'lucide-react';
import surakshaLogoSidebar from '@/assets/suraksha-logo-sidebar.png';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { user, selectedInstitute, selectedClass, selectedSubject, selectedChild, selectedOrganization, selectedTransport, logout, setSelectedInstitute, setSelectedClass, setSelectedSubject, setSelectedChild, setSelectedOrganization, setSelectedTransport } = useAuth();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check if institute type is tuition_institute for conditional labels
  const isTuitionInstitute = selectedInstitute?.type === 'tuition_institute';
  const subjectLabel = isTuitionInstitute ? 'Sub Class' : 'Subject';
  
  // Derive current page from URL (for component rendering)
  const currentPage = React.useMemo(() => extractPageFromUrl(location.pathname), [location.pathname]);
  
  // Get sidebar highlight page (maps sub-pages to parent for highlighting)
  const sidebarHighlightPage = React.useMemo(() => getSidebarHighlightPage(location.pathname), [location.pathname]);
  
  // Broadcast collapse state to the app (for responsive grids)
  React.useEffect(() => {
    const root = document.documentElement;
    if (isCollapsed) {
      root.classList.add('sidebar-collapsed');
      root.classList.remove('sidebar-expanded');
    } else {
      root.classList.add('sidebar-expanded');
      root.classList.remove('sidebar-collapsed');
    }
    window.dispatchEvent(new CustomEvent('sidebar:state', { detail: { collapsed: isCollapsed } }));
  }, [isCollapsed]);
  
  // Institute-specific role
  const userRole = useInstituteRole();

  // Get menu items based on current selection state
  const getMenuItems = () => {
    // Special handling for child selection (Parent viewing child's data)
    if (selectedChild) {
      return [
        {
          id: 'child-attendance',
          label: 'Transport Attendance',
          icon: Truck,
          permission: 'view-dashboard',
          alwaysShow: true
        }
      ];
    }

    // Special handling for organization selection
    if (selectedOrganization) {
      return [
        {
          id: 'organizations',
          label: 'Select Organizations',
          icon: Building2,
          permission: 'view-organizations',
          alwaysShow: true
        },
        {
          id: 'organization-gallery',
          label: 'Gallery',
          icon: Camera,
          permission: 'view-organizations',
          alwaysShow: true
        },
        {
          id: 'organization-courses', 
          label: 'Courses',
          icon: BookOpen,
          permission: 'view-organizations',
          alwaysShow: true
        }
      ];
    }

    // Special handling for Student role
    if (userRole === 'Student') {
      // 1. Student without institute - only show basic options + payment
      if (!selectedInstitute) {
        return [
          {
            id: 'profile',
            label: 'Profile',
            icon: User,
            permission: 'view-dashboard',
            alwaysShow: true
          },
          {
            id: 'dashboard',
            label: 'Select Institutes',
            icon: LayoutDashboard,
            permission: 'view-dashboard',
            alwaysShow: false
          },
          {
            id: 'organizations',
            label: 'Organizations',
            icon: Building2,
            permission: 'view-organizations',
            alwaysShow: true,
            locked: true
          },
          {
            id: 'transport',
            label: 'Transport',
            icon: Truck,
            permission: 'view-dashboard',
            alwaysShow: true,
            locked: true
          },
          {
            id: 'id-cards',
            label: 'ID Cards',
            icon: IdCard,
            permission: 'view-dashboard',
            alwaysShow: true
          }
        ];
      }

      // 2. Student with institute selected - show basic navigation with Select Class
      if (selectedInstitute && !selectedClass) {
        return [
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: LayoutDashboard,
            permission: 'view-dashboard',
            alwaysShow: false
          },
          {
            id: 'select-class',
            label: 'Select Class',
            icon: School,
            permission: 'view-classes',
            alwaysShow: false
          },
          {
            id: 'my-attendance',
            label: 'My Attendance',
            icon: UserCheck,
            permission: 'view-dashboard',
            alwaysShow: false
          },
          {
            id: 'institute-lectures',
            label: 'Institute Lectures',
            icon: Video,
            permission: 'view-lectures',
            alwaysShow: false
          }
        ];
      }

      // 3. Student with institute and class selected (but no subject) - show subject selection
      if (selectedInstitute && selectedClass && !selectedSubject) {
        return [
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: LayoutDashboard,
            permission: 'view-dashboard',
            alwaysShow: false
          },
          {
            id: 'my-attendance',
            label: 'My Attendance',
            icon: UserCheck,
            permission: 'view-dashboard',
            alwaysShow: false
          },
          {
            id: 'select-subject',
            label: isTuitionInstitute ? 'Select Sub Class' : 'Select Subject',
            icon: BookOpen,
            permission: 'view-subjects',
            alwaysShow: false
          }
        ];
      }

      // 4. Student with institute, class, and subject all selected - show subject-specific navigation
      if (selectedInstitute && selectedClass && selectedSubject) {
        return [
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: LayoutDashboard,
            permission: 'view-dashboard',
            alwaysShow: false
          },
          {
            id: 'my-attendance',
            label: 'My Attendance',
            icon: UserCheck,
            permission: 'view-dashboard',
            alwaysShow: false
          },
          {
            id: 'lectures',
            label: 'Lectures',
            icon: Video,
            permission: 'view-lectures',
            alwaysShow: false
          },
          {
            id: 'free-lectures',
            label: 'Free Lectures',
            icon: Video,
            permission: 'view-lectures',
            alwaysShow: false
          },
          {
            id: 'homework',
            label: 'Homework',
            icon: Notebook,
            permission: 'view-homework',
            alwaysShow: false
          },
          {
            id: 'exams',
            label: 'Exams',
            icon: Award,
            permission: 'view-exams',
            alwaysShow: false
          },
          {
            id: 'subject-payments',
            label: `${subjectLabel} Payments`,
            icon: CreditCard,
            permission: 'view-payments',
            alwaysShow: false
          }
         ];
      }
      // Return empty for any other Student states
      return [];
    }

    // Special handling for Teacher role
    if (userRole === 'Teacher') {
      // 1. Teacher without institute - only show basic options (NO Organizations)
      if (!selectedInstitute) {
        return [
          {
            id: 'profile',
            label: 'Profile',
            icon: User,
            permission: 'view-dashboard',
            alwaysShow: true
          },
          {
            id: 'dashboard',
            label: 'Select Institutes',
            icon: LayoutDashboard,
            permission: 'view-dashboard',
            alwaysShow: false
          }
        ];
      }

      // 2. Teacher with institute selected (but no class/subject) - NO Organizations
      if (selectedInstitute && !selectedClass && !selectedSubject) {
        return [
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: LayoutDashboard,
            permission: 'view-dashboard',
            alwaysShow: false
          },
          {
            id: 'institute-subjects',
            label: `Institute ${subjectLabel}s`,
            icon: BookOpen,
            permission: 'view-subjects',
            alwaysShow: false,
            section: 'Main\'s'
          },
          {
            id: 'select-class',
            label: 'Select Class',
            icon: School,
            permission: 'view-classes',
            alwaysShow: false
          },
          {
            id: 'select-subject',
            label: isTuitionInstitute ? 'Select Sub Class' : 'Select Subject',
            icon: BookOpen,
            permission: 'view-subjects',
            alwaysShow: false
          },
          {
            id: 'institute-lectures',
            label: 'Institute Lectures',
            icon: Video,
            permission: 'view-lectures',
            alwaysShow: false
          }
        ];
      }

      // 3. Teacher with institute and class selected (but no subject)
      if (selectedInstitute && selectedClass && !selectedSubject) {
        return [
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: LayoutDashboard,
            permission: 'view-dashboard',
            alwaysShow: false
          },
          {
            id: 'select-subject',
            label: isTuitionInstitute ? 'Select Sub Class' : 'Select Subject',
            icon: BookOpen,
            permission: 'view-subjects',
            alwaysShow: false
          },
          {
            id: 'students',
            label: 'Students',
            icon: GraduationCap,
            permission: 'view-students',
            alwaysShow: false
          },
          {
            id: 'unverified-students',
            label: 'Verify Students',
            icon: UserCheck,
            permission: 'view-students',
            alwaysShow: false
          }
        ];
      }

      // 4. Teacher with institute, class, and subject all selected
      if (selectedInstitute && selectedClass && selectedSubject) {
        return [
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: LayoutDashboard,
            permission: 'view-dashboard',
            alwaysShow: false
          },
          {
            id: 'select-subject',
            label: isTuitionInstitute ? 'Select Sub Class' : 'Select Subject',
            icon: BookOpen,
            permission: 'view-subjects',
            alwaysShow: false
          },
          {
            id: 'students',
            label: 'Students',
            icon: GraduationCap,
            permission: 'view-students',
            alwaysShow: false
          },
          {
            id: 'unverified-students',
            label: 'Verify Students',
            icon: UserCheck,
            permission: 'view-students',
            alwaysShow: false
          }
          // Note: subject-payments is now shown in the Payments section via getPaymentItems()
        ];
      }
      // Return empty for any other Teacher states
      return [];
    }

    // Special handling for InstituteAdmin role
    if (userRole === 'InstituteAdmin') {
      if (!selectedInstitute) {
        return [
          {
            id: 'profile',
            label: 'Profile',
            icon: User,
            permission: 'view-dashboard',
            alwaysShow: true
          },
          {
            id: 'dashboard',
            label: 'Select Institutes',
            icon: LayoutDashboard,
            permission: 'view-dashboard',
            alwaysShow: false
          },
          {
            id: 'organizations',
            label: 'Organizations',
            icon: Building2,
            permission: 'view-organizations',
            alwaysShow: true,
            locked: true
          }
        ];
      }

      // If only institute is selected
      if (selectedInstitute && !selectedClass && !selectedSubject) {
        const baseItems = [
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: LayoutDashboard,
            permission: 'view-dashboard',
            alwaysShow: false
          },
          // Only show Organization menu item if NOT a tuition_institute
          ...(isTuitionInstitute ? [] : [{
            id: 'institute-organizations',
            label: 'Organization',
            icon: Building2,
            permission: 'view-organizations',
            alwaysShow: true
          }]),
          {
            id: 'institute-users',
            label: 'Institute Users',
            icon: Users,
            permission: 'view-users',
            alwaysShow: false
          },
          {
            id: 'parents',
            label: 'Parents',
            icon: Users,
            permission: 'view-parents',
            alwaysShow: false
          },
          {
            id: 'verify-image',
            label: 'Verify Image',
            icon: ImageIcon,
            permission: 'view-users',
            alwaysShow: false
          },
          {
            id: 'classes',
            label: 'All Classes',
            icon: School,
            permission: 'view-classes',
            alwaysShow: false
          },
          {
            id: 'institute-subjects',
            label: `Institute ${subjectLabel}s`,
            icon: BookOpen,
            permission: 'view-subjects',
            alwaysShow: false
          },
          {
            id: 'select-class',
            label: 'Select Class',
            icon: School,
            permission: 'view-classes',
            alwaysShow: false
          },
          {
            id: 'select-subject',
            label: isTuitionInstitute ? 'Select Sub Class' : 'Select Subject',
            icon: BookOpen,
            permission: 'view-subjects',
            alwaysShow: false
          },
          {
            id: 'institute-lectures',
            label: 'Institute Lectures',
            icon: Video,
            permission: 'view-lectures',
            alwaysShow: false
          }
        ];
        return baseItems;
      }

      // If institute and class are selected (but not subject)
      if (selectedInstitute && selectedClass && !selectedSubject) {
        return [
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: LayoutDashboard,
            permission: 'view-dashboard',
            alwaysShow: false
          },
          {
            id: 'students',
            label: 'Students',
            icon: GraduationCap,
            permission: 'view-students',
            alwaysShow: false
          },
          {
            id: 'unverified-students',
            label: 'Verify Students',
            icon: UserCheck,
            permission: 'view-students',
            alwaysShow: false
          },
          {
            id: 'parents',
            label: 'Parents',
            icon: Users,
            permission: 'view-parents',
            alwaysShow: false
          },
          {
            id: 'class-subjects',
            label: `Class ${subjectLabel}s`,
            icon: BookOpen,
            permission: 'view-subjects',
            alwaysShow: false
          },
          {
            id: 'select-subject',
            label: isTuitionInstitute ? 'Select Sub Class' : 'Select Subject',
            icon: BookOpen,
            permission: 'view-subjects',
            alwaysShow: false
          }
        ];
      }

      // If institute, class, and subject are all selected
      if (selectedInstitute && selectedClass && selectedSubject) {
        return [
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: LayoutDashboard,
            permission: 'view-dashboard',
            alwaysShow: false
          },
          {
            id: 'students',
            label: 'Students',
            icon: GraduationCap,
            permission: 'view-students',
            alwaysShow: false
          },
          {
            id: 'unverified-students',
            label: 'Verify Students',
            icon: UserCheck,
            permission: 'view-students',
            alwaysShow: false
          },
          // Parents is class-scoped only (do not show under subject context)
          {
            id: 'select-subject',
            label: isTuitionInstitute ? 'Select Sub Class' : 'Select Subject',
            icon: BookOpen,
            permission: 'view-subjects',
            alwaysShow: false
          }
          // Note: subject-payments is now shown in the Payments section via getPaymentItems()
        ];
      }
      // Return empty for any other InstituteAdmin states
      return [];
    }

    // Special handling for Parent role
    if (userRole === 'Parent') {
      // 1. Parent without institute - show My Children option before institute selection
      if (!selectedInstitute) {
        return [
          {
            id: 'my-children',
            label: 'My Children',
            icon: Users,
            permission: 'view-parents',
            alwaysShow: true
          },
          {
            id: 'dashboard',
            label: 'Select Institutes',
            icon: LayoutDashboard,
            permission: 'view-dashboard',
            alwaysShow: false
          },
          {
            id: 'transport',
            label: 'Transport',
            icon: Truck,
            permission: 'view-transport',
            alwaysShow: true,
            locked: true,
            subItems: [
              {
                id: 'transport',
                label: 'My Transport',
                icon: Truck,
                permission: 'view-transport',
                alwaysShow: false
              },
              {
                id: 'transport-attendance',
                label: 'Transport Attendance',
                icon: UserCheck,
                permission: 'view-transport',
                alwaysShow: false
              }
            ]
          }
        ];
      }

      // 2. Parent without child selected - show Dashboard and Select Child
      if (!selectedChild) {
        return [
          {
            id: 'dashboard',
            label: 'Dashboard',
            icon: LayoutDashboard,
            permission: 'view-dashboard',
            alwaysShow: false
          },
          {
            id: 'parents',
            label: 'Select Child',
            icon: Users,
            permission: 'view-parents',
            alwaysShow: false
          },
          {
            id: 'transport',
            label: 'Transport',
            icon: Truck,
            permission: 'view-transport',
            alwaysShow: true,
            subItems: [
              {
                id: 'transport',
                label: 'My Transport',
                icon: Truck,
                permission: 'view-transport',
                alwaysShow: false
              },
              {
                id: 'transport-attendance',
                label: 'Transport Attendance',
                icon: UserCheck,
                permission: 'view-transport',
                alwaysShow: false
              }
            ]
          }
        ];
      }

      // 2. Parent with child selected - show main sections without institute navigation
      if (selectedChild) {
        return [
          {
            id: 'child-attendance',
            label: 'Transport Attendance',
            icon: Truck,
            permission: 'view-dashboard',
            alwaysShow: true
          }
        ];
      }

      return [];
    }

    // Special handling for AttendanceMarker role - only show specific items when institute is selected
    if (userRole === 'AttendanceMarker') {
      if (!selectedInstitute) {
        return [
          {
            id: 'dashboard',
            label: 'Select Institutes',
            icon: LayoutDashboard,
            permission: 'view-dashboard',
            alwaysShow: false
          },
          {
            id: 'transport',
            label: 'Transport',
            icon: Truck,
            permission: 'view-transport',
            alwaysShow: true,
            locked: true,
            subItems: [
              {
                id: 'transport',
                label: 'My Transport',
                icon: Truck,
                permission: 'view-transport',
                alwaysShow: false
              },
              {
                id: 'transport-attendance',
                label: 'Transport Attendance',
                icon: UserCheck,
                permission: 'view-transport',
                alwaysShow: false
              }
            ]
          }
        ];
      }

      // For AttendanceMarker with institute selected - show dashboard and attendance options
      const baseItems = [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          permission: 'view-dashboard',
          alwaysShow: false
        },
        {
          id: 'attendance-markers',
          label: 'Attendance Markers',
          icon: Users,
          permission: 'manage-attendance-markers',
          alwaysShow: false
        }
      ];
      
      // Only show select-class at institute level (not when class is selected)
      if (!selectedClass) {
        baseItems.push({
          id: 'select-class',
          label: 'Select Class',
          icon: School,
          permission: 'view-classes',
          alwaysShow: false
        });
      }
      
      baseItems.push({
        id: 'select-subject',
        label: 'Select Subject',
        icon: BookOpen,
        permission: 'view-subjects',
        alwaysShow: false
      });
      
      // Add Free Lectures if subject is selected
      if (selectedSubject) {
        baseItems.push({
          id: 'free-lectures',
          label: 'Free Lectures',
          icon: Video,
          permission: 'view-lectures',
          alwaysShow: false
        });
      }
      
      return baseItems;
    }

    // Base items that are always available for all other users (User role, SystemAdmin, etc.)
    const baseItems = [
      {
        id: 'dashboard',
        label: selectedInstitute ? 'Dashboard' : 'Select Institutes',
        icon: LayoutDashboard,
        permission: 'view-dashboard',
        alwaysShow: false
      },
      {
        id: 'organizations',
        label: 'Organizations',
        icon: Building2,
        permission: 'view-organizations',
        alwaysShow: true,
        locked: !selectedInstitute
      }
    ];

    // If no institute is selected, return basic navigation including organizations and transport
    if (!selectedInstitute) {
      return [
        ...baseItems,
        {
          id: 'transport',
          label: 'Transport',
          icon: Truck,
          permission: 'view-transport',
          alwaysShow: true,
          locked: true,
          subItems: [
            {
              id: 'transport',
              label: 'My Transport',
              icon: Truck,
              permission: 'view-transport',
              alwaysShow: false
            },
            {
              id: 'transport-attendance',
              label: 'Transport Attendance',
              icon: UserCheck,
              permission: 'view-transport',
              alwaysShow: false
            }
          ]
        }
      ];
    }

    // For other roles (SystemAdmin, etc.) with institute selected, show full navigation
    return [
      ...baseItems,
      {
        id: 'users',
        label: 'Users',
        icon: Users,
        permission: 'view-users',
        alwaysShow: false
      },
      {
        id: 'students',
        label: 'Students',
        icon: GraduationCap,
        permission: 'view-students',
        alwaysShow: false
      },
      // Parents is class-scoped only (do not show under subject context)
      ...(!selectedSubject ? [{
        id: 'parents',
        label: 'Parents',
        icon: Users,
        permission: 'view-parents',
        alwaysShow: false
      }] : []),
      // Remove teachers section for SystemAdmin
      ...(user?.role !== 'SystemAdmin' ? [{
        id: 'teachers',
        label: 'Teachers',
        icon: UserCheck,
        permission: 'view-teachers',
        alwaysShow: false
      }] : []),
      {
        id: 'classes',
        label: 'All Classes',
        icon: School,
        permission: 'view-classes',
        alwaysShow: false
      },
      {
        id: 'institute-subjects',
        label: `Institute ${subjectLabel}s`,
        icon: BookOpen,
        permission: 'view-subjects',
        alwaysShow: false
      },
      // Only show selection options for non-SystemAdmin users
      ...(user?.role !== 'SystemAdmin' ? [
        {
          id: 'select-class',
          label: 'Select Class',
          icon: School,
          permission: 'view-classes',
          alwaysShow: false
        },
        {
          id: 'select-subject',
          label: 'Select Subject',
          icon: BookOpen,
          permission: 'view-subjects',
          alwaysShow: false
        }
      ] : []),
      {
        id: 'institutes',
        label: 'Institutes',
        icon: Building2,
        permission: 'view-institutes',
        alwaysShow: false
      }
    ];
  };

  const getAttendanceItems = () => {
    // For Student - no additional attendance items needed as they are in main menu
    if (userRole === 'Student') {
      return [];
    }

    // For Teacher - show specific attendance items based on selection state
    if (userRole === 'Teacher') {
      // 3. Teacher with institute and class selected (but no subject)
      if (selectedInstitute && selectedClass && !selectedSubject) {
        return [
          {
            id: 'daily-attendance',
            label: 'Daily Attendance',
            icon: UserCheck,
            permission: 'view-attendance',
            alwaysShow: false
          },
          {
            id: 'qr-attendance',
            label: 'Mark Attendance',
            icon: QrCode,
            permission: 'mark-attendance',
            alwaysShow: false
          }
        ];
      }

      // 4. Teacher with institute, class, and subject all selected
      if (selectedInstitute && selectedClass && selectedSubject) {
        return [
          {
            id: 'daily-attendance',
            label: 'Daily Attendance',
            icon: UserCheck,
            permission: 'view-attendance',
            alwaysShow: false
          },
          {
            id: 'qr-attendance',
            label: 'Mark Attendance',
            icon: QrCode,
            permission: 'mark-attendance',
            alwaysShow: false
          }
        ];
      }

      // For other teacher states, no attendance items
      return [];
    }

    // For InstituteAdmin - show specific attendance items based on selection
    if (userRole === 'InstituteAdmin') {
      if (!selectedInstitute) {
        return [];
      }

      // For InstituteAdmin with only institute selected
      if (selectedInstitute && !selectedClass && !selectedSubject) {
        return [
          {
            id: 'daily-attendance',
            label: 'Daily Attendance',
            icon: UserCheck,
            permission: 'view-attendance',
            alwaysShow: false
          },
          {
            id: 'qr-attendance',
            label: 'Mark Attendance',
            icon: QrCode,
            permission: 'mark-attendance',
            alwaysShow: false
          }
        ];
      }

      // For InstituteAdmin with institute and class selected (or all three selected)
      if (selectedInstitute && selectedClass) {
        return [
          {
            id: 'daily-attendance',
            label: 'Daily Attendance',
            icon: UserCheck,
            permission: 'view-attendance',
            alwaysShow: false
          },
          {
            id: 'qr-attendance',
            label: 'Mark Attendance',
            icon: QrCode,
            permission: 'mark-attendance',
            alwaysShow: false
          }
        ];
      }
    }

    // Default attendance items for other roles
    const attendanceItems = [
      {
        id: 'daily-attendance',
        label: 'Daily Attendance',
        icon: UserCheck,
        permission: 'view-attendance',
        alwaysShow: false
      },
      {
        id: 'attendance-markers',
        label: 'Attendance Markers',
        icon: Users,
        permission: 'manage-attendance-markers',
        alwaysShow: false
      },
      {
        id: 'qr-attendance',
        label: 'Mark Attendance',
        icon: QrCode,
        permission: 'mark-attendance',
        alwaysShow: userRole === 'AttendanceMarker' // Always show for AttendanceMarker
      }
    ];

    return attendanceItems;
  };

  const getSystemItems = () => {
    // For Student - no additional system items needed as they are in main menu
    if (userRole === 'Student') {
      return [];
    }

    // For Teacher - show academic items only when institute, class, and subject are all selected
    if (userRole === 'Teacher') {
      if (selectedInstitute && selectedClass && selectedSubject) {
        return [
          {
            id: 'lectures',
            label: 'Lectures',
            icon: Video,
            permission: 'view-lectures',
            alwaysShow: false
          },
          {
            id: 'free-lectures',
            label: 'Free Lectures',
            icon: Video,
            permission: 'view-lectures',
            alwaysShow: false
          },
          {
            id: 'homework',
            label: 'Homework',
            icon: Notebook,
            permission: 'view-homework',
            alwaysShow: false
          },
          {
            id: 'exams',
            label: 'Exams',
            icon: FileText,
            permission: 'view-exams',
            alwaysShow: false
          }
        ];
      }
      
      // For other teacher selection states, return empty array
      return [];
    }

    // For InstituteAdmin - show academic items when institute, class, and subject are all selected
    if (userRole === 'InstituteAdmin') {
      if (selectedInstitute && selectedClass && selectedSubject) {
        return [
          {
            id: 'lectures',
            label: 'Lectures',
            icon: Video,
            permission: 'view-lectures',
            alwaysShow: false
          },
          {
            id: 'free-lectures',
            label: 'Free Lectures',
            icon: Video,
            permission: 'view-lectures',
            alwaysShow: false
          },
          {
            id: 'homework',
            label: 'Homework',
            icon: Notebook,
            permission: 'view-homework',
            alwaysShow: false
          },
          {
            id: 'exams',
            label: 'Exams',
            icon: FileText,
            permission: 'view-exams',
            alwaysShow: false
          }
        ];
      }
      
      // For other InstituteAdmin selection states, return empty array
      return [];
    }

    // Default system items for other roles
    const systemItems = [
      {
        id: 'grading',
        label: 'Grading',
        icon: BarChart3,
        permission: 'view-grading',
        alwaysShow: false
      },
      {
        id: 'live-lectures',
        label: 'Live Lectures',
        icon: Video,
        permission: 'view-lectures',
        alwaysShow: false
      },
      {
        id: 'homework',
        label: 'Homework',
        icon: Notebook,
        permission: 'view-homework',
        alwaysShow: false
      },
      {
        id: 'exams',
        label: 'Exams',
        icon: FileText,
        permission: 'view-exams',
        alwaysShow: false
      }
    ];

    return systemItems;
  };

  const getMyChildrenItems = () => {
    // Show "My Children" section when no institute is selected for Parent, User, and UserWithoutStudent roles
    const userType = user?.userType?.toLowerCase();
    const isParentOrUserRole = userType === 'parent' || userType === 'user' || userType === 'user_without_student' || userRole === 'UserWithoutStudent';
    if (!selectedInstitute && isParentOrUserRole) {
      return [
        {
          id: 'my-children',
          label: 'My Children',
          icon: Users,
          permission: 'view-parents',
          alwaysShow: true
        }
      ];
    }
    return [];
  };

  const getChildItems = () => {
    // Show child-specific navigation when a child is selected
    if (!selectedChild) {
      return [];
    }

    const childId = selectedChild.id;
    
    return [
      {
        id: 'select-institute',
        label: 'Select Institute',
        icon: Building2,
        permission: 'view-profile',
        alwaysShow: true,
        path: `/child/${childId}/select-institute`
      }
    ];
  };

  const getSystemPaymentItems = () => {
    // Show "System Payments" section when no institute is selected
    if (!selectedInstitute) {
      return [
        {
          id: 'system-payment',
          label: 'System Payments',
          icon: CreditCard,
          permission: 'view-profile',
          alwaysShow: true
        }
      ];
    }
    return [];
  };

  const getPaymentItems = () => {
    // Only show payment sections for InstituteAdmin, Teacher, Student
    if (!['InstituteAdmin', 'Teacher', 'Student'].includes(userRole)) {
      return [];
    }

    const paymentItems = [];

    // 1. When only institute is selected - show Institute Payments for all three roles
    // + My Submissions for Students only
    if (selectedInstitute && !selectedClass && !selectedSubject) {
      paymentItems.push({
        id: 'institute-payments',
        label: 'Institute Payments',
        icon: CreditCard,
        permission: 'view-profile',
        alwaysShow: false
      });

      // Add My Submissions for Students only when only institute is selected

      // Add My Submissions for Students only when only institute is selected
      if (userRole === 'Student') {
        paymentItems.push({
          id: 'my-submissions',
          label: 'My Submissions',
          icon: FileText,
          permission: 'view-profile',
          alwaysShow: false
        });
      }
    }

    // 2. When institute and class selected (but no subject) - no payment items

    // 3. When institute, class, and subject are all selected - show Subject Payments only
    if (selectedInstitute && selectedClass && selectedSubject) {
      paymentItems.push({
        id: 'subject-payments',
        label: `${subjectLabel} Payments`,
        icon: CreditCard,
        permission: 'view-profile',
        alwaysShow: false
      });

      // 4. Add Subject Pay Submission for Students only when all three are selected
      if (userRole === 'Student') {
        paymentItems.push({
          id: 'subject-pay-submission',
          label: `${subjectLabel} Pay Submission`,
          icon: FileText,
          permission: 'view-profile',
          alwaysShow: false
        });
      }
    }

    return paymentItems;
  };

  const getSmsItems = () => {
    const items: any[] = [];
    // Only show SMS items at institute level (not when class is selected)
    if (userRole === 'InstituteAdmin' && selectedInstitute && !selectedClass) {
      items.push({
        id: 'sms',
        label: 'SMS',
        icon: MessageSquare,
        permission: 'manage-sms',
        alwaysShow: true
      });
      items.push({
        id: 'sms-history',
        label: 'SMS History',
        icon: MessageSquare,
        permission: 'manage-sms',
        alwaysShow: true
      });
    }
    return items;
  };

  /**
   * Get Notification menu items based on institute selection
   * - Before institute selection: Show "Notifications" (system notifications)
   * - After institute selection: Show "Institute Notifications" with admin/teacher CRUD access
   */
  const getNotificationItems = () => {
    // Before institute selection - show system notifications
    if (!selectedInstitute) {
      return [
        {
          id: 'notifications',
          label: 'Notifications',
          icon: Bell,
          permission: 'view-dashboard',
          alwaysShow: true
        }
      ];
    }

    // After institute selection - show institute notifications
    // Admin/Teacher can also create notifications (handled in the page component)
    return [
      {
        id: 'institute-notifications',
        label: 'Institute Notifications',
        icon: Bell,
        permission: 'view-dashboard',
        alwaysShow: true
      }
    ];
  };

  const getSettingsItems = () => {
    // Always show settings if user is logged in
    if (!user) {
      return [];
    }

    // If organization is selected, only show Profile
    if (selectedOrganization) {
      return [
        {
          id: 'profile',
          label: 'Profile',
          icon: User,
          permission: 'view-profile',
          alwaysShow: true
        }
      ];
    }

    // For Parent - show specific settings items based on child selection
    if (userRole === 'Parent') {
      const baseItems = [
        {
          id: 'profile',
          label: 'Profile',
          icon: User,
          permission: 'view-profile',
          alwaysShow: true
        }
      ];

      // Add System Payment only when child is selected
      if (selectedChild) {
        baseItems.push({
          id: 'system-payment',
          label: 'System Payment',
          icon: CreditCard,
          permission: 'view-profile',
          alwaysShow: false
        });
      }

      return baseItems;
    }

    // For Student - always show Profile + Payment if no institute
    if (userRole === 'Student') {
      const baseItems = [
        {
          id: 'profile',
          label: 'Profile',
          icon: User,
          permission: 'view-profile',
          alwaysShow: true
        }
      ];

      // Add Institute Profile when institute is selected
      if (selectedInstitute) {
        baseItems.push({
          id: 'institute-profile',
          label: 'Institute Profile',
          icon: IdCard,
          permission: 'view-profile',
          alwaysShow: false
        });
      }

      // Add System Payment only when no institute is selected
      if (!selectedInstitute) {
        baseItems.push({
          id: 'system-payment',
          label: 'System Payment',
          icon: CreditCard,
          permission: 'view-profile',
          alwaysShow: false
        });
      }

      return baseItems;
    }

    // For Teacher - show specific settings items based on selection state + Payment if no institute
    if (userRole === 'Teacher') {
      const baseItems = [
        {
          id: 'profile',
          label: 'Profile',
          icon: User,
          permission: 'view-profile',
          alwaysShow: true
        }
      ];

      // Add Institute Profile when institute is selected
      if (selectedInstitute) {
        baseItems.push({
          id: 'institute-profile',
          label: 'Institute Profile',
          icon: IdCard,
          permission: 'view-profile',
          alwaysShow: false
        });
      }

      // Add System Payment only when no institute is selected
      if (!selectedInstitute) {
        baseItems.push({
          id: 'system-payment',
          label: 'System Payment',
          icon: CreditCard,
          permission: 'view-profile',
          alwaysShow: false
        });
      }

      return baseItems;
    }

    // For InstituteAdmin - show specific settings items + Payment if no institute
    if (userRole === 'InstituteAdmin') {
      const baseItems = [
        {
          id: 'profile',
          label: 'Profile',
          icon: User,
          permission: 'view-profile',
          alwaysShow: true
        }
      ];

      // Add System Payment only when no institute is selected
      if (!selectedInstitute) {
        baseItems.push({
          id: 'system-payment',
          label: 'System Payment',
          icon: CreditCard,
          permission: 'view-profile',
          alwaysShow: false
        });
      } else {
        // Add only Institute Profile when institute is selected (removed Institute Details)
        baseItems.push({
          id: 'institute-profile',
          label: 'Institute Profile',
          icon: IdCard,
          permission: 'view-profile',
          alwaysShow: false
        });
      }

      return baseItems;
    }

    // Default settings items for other roles (including AttendanceMarker)
    const settingsItems = [
      {
        id: 'profile',
        label: 'Profile',
        icon: User,
        permission: 'view-profile',
        alwaysShow: true
      },
      ...(selectedInstitute ? [{
        id: 'institute-profile',
        label: 'Institute Profile',
        icon: Building2,
        permission: 'view-profile',
        alwaysShow: false
      }] : []),
      {
        id: 'settings',
        label: 'Settings',
        icon: Settings,
        permission: 'view-settings',
        alwaysShow: false
      }
    ];

    return settingsItems;
  };

  const menuItems = getMenuItems();
  const attendanceItems = getAttendanceItems();
  const systemItems = getSystemItems();
  const myChildrenItems = getMyChildrenItems();
  const childItems = getChildItems();
  const systemPaymentItems = getSystemPaymentItems();
  const paymentItems = getPaymentItems();
  const smsItems = getSmsItems();
  const notificationItems = getNotificationItems();
  const settingsItems = getSettingsItems();

  // Ensure the active page is always visible in the sidebar even if hidden by selection rules
  const menuItemsDisplay = [...menuItems];
  const attendanceItemsDisplay = [...attendanceItems];
  const systemItemsDisplay = [...systemItems];
  const myChildrenItemsDisplay = [...myChildrenItems];
  const childItemsDisplay = [...childItems];
  const systemPaymentItemsDisplay = [...systemPaymentItems];
  const paymentItemsDisplay = [...paymentItems];
  const smsItemsDisplay = [...(smsItems || [])];
  const notificationItemsDisplay = [...notificationItems];
  const settingsItemsDisplay = [...settingsItems];

  // Only show "ID Cards" in sidebar when NO institute is selected
  // Insert right after "Profile" in settings section for consistent placement
  if (!selectedInstitute) {
    const idCardsItem = {
      id: 'id-cards',
      label: 'ID Cards',
      icon: IdCard,
      permission: 'view-dashboard',
      alwaysShow: true
    };

    // Insert ID Cards after Profile in settingsItemsDisplay
    const profileIndex = settingsItemsDisplay.findIndex(item => item.id === 'profile');
    if (profileIndex !== -1) {
      settingsItemsDisplay.splice(profileIndex + 1, 0, idCardsItem);
    } else {
      // Fallback: add at beginning if no profile found
      settingsItemsDisplay.unshift(idCardsItem);
    }
  }

  const activeExists = [
    menuItemsDisplay,
    attendanceItemsDisplay,
    systemItemsDisplay,
    myChildrenItemsDisplay,
    childItemsDisplay,
    systemPaymentItemsDisplay,
    paymentItemsDisplay,
    smsItemsDisplay,
    notificationItemsDisplay,
    settingsItemsDisplay
  ].some(list => list.some(i => i.id === sidebarHighlightPage));

  if (!activeExists && currentPage) {
    // Don't auto-add sub-routes (pages with / in them) to sidebar
    const isSubRoute = currentPage.includes('/');
    
    if (!isSubRoute) {
      const toTitle = (s: string) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const label = toTitle(currentPage);

      let target = menuItemsDisplay as any[];
      let icon: any = LayoutDashboard;
      let allowPush = true;

      // Institute-specific pages that require institute selection
      const instituteSpecificPages = /^(classes|subjects|students|teachers|users|parents|institutes|daily-attendance|qr-attendance|live-lectures|grading|exams|homework|results|lectures|free-lectures|institute-details|institute-users|verify-image|select-class|select-subject|unverified-students)$/i;
      
      // Don't show institute-specific pages in sidebar when no institute is selected
      if (!selectedInstitute && instituteSpecificPages.test(currentPage)) {
        allowPush = false;
      }

      // NEVER auto-add "Verify Students" for students/parents/etc.
      if (currentPage === 'unverified-students' && !['InstituteAdmin', 'Teacher'].includes(userRole)) {
        allowPush = false;
      }

      if (/payment/i.test(currentPage)) { target = paymentItemsDisplay; icon = CreditCard; }
      else if (/sms/i.test(currentPage)) {
        if (selectedInstitute) { target = smsItemsDisplay; icon = MessageSquare; }
        else { allowPush = false; }
      }
      else if (/attendance/i.test(currentPage)) { target = attendanceItemsDisplay; icon = UserCheck; }
      else if (/(lecture|homework|exam|result|grading)/i.test(currentPage)) { target = systemItemsDisplay; icon = Video; }
      else if (/(profile|settings|appearance)/i.test(currentPage)) { target = settingsItemsDisplay; icon = Settings; }

      if (allowPush) {
        target.push({ id: currentPage, label, icon, permission: 'view-dashboard', alwaysShow: true });
      }
    }
  }

  const filterItemsByPermission = (items: any[]) => {
    return items.filter(item => {
      // Always show items marked as alwaysShow
      if (item.alwaysShow) {
        return true;
      }
      // Otherwise check permission
      return AccessControl.hasPermission(userRole as any, item.permission);
    });
  };

  const handleItemClick = (itemId: string) => {
    console.log('Sidebar item clicked:', itemId);
    
    // Build context-aware URL
    const context = {
      instituteId: selectedInstitute?.id,
      classId: selectedClass?.id,
      subjectId: selectedSubject?.id,
      childId: selectedChild?.id,
      organizationId: selectedOrganization?.id,
      transportId: selectedTransport?.id
    };
    
    // Handle special cases
    if (itemId === 'organizations' && !selectedInstitute) {
      window.open('https://org.suraksha.lk/', '_blank');
      onClose();
      return;
    }
    
    // Handle my-children - clear child selection
    if (itemId === 'my-children') {
      setSelectedChild(null);
      navigate('/my-children');
      onClose();
      return;
    }
    
    // Build URL with context and preserve query params
    const searchParams = new URLSearchParams(location.search);
    const queryString = searchParams.toString();
    const url = buildSidebarUrl(itemId, context);
    const fullUrl = url + (queryString ? `?${queryString}` : '');
    
    console.log('🔗 [Sidebar] Navigating to:', fullUrl);
    navigate(fullUrl);
    onClose();
  };

  const handleLogout = () => {
    logout();
    onClose();
  };

  const handleBackNavigation = () => {
    const searchParams = new URLSearchParams(location.search);
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    
    if (selectedTransport) {
      setSelectedTransport(null);
      navigate(`/transport${queryString}`);
    } else if (selectedOrganization) {
      setSelectedOrganization(null);
      navigate(`/organizations${queryString}`);
    } else if (selectedChild) {
      setSelectedChild(null);
      navigate(`/my-children${queryString}`);
    } else if (selectedSubject) {
      setSelectedSubject(null);
      navigate(`/institute/${selectedInstitute?.id}/class/${selectedClass?.id}/dashboard${queryString}`);
    } else if (selectedClass) {
      setSelectedClass(null);
      navigate(`/institute/${selectedInstitute?.id}/dashboard${queryString}`);
    } else if (selectedInstitute) {
      setSelectedInstitute(null);
      navigate(`/dashboard${queryString}`);
    }
  };

  const SidebarSection = ({ title, items }: { title: string; items: any[] }) => {
    const filteredItems = filterItemsByPermission(items);
    
    if (filteredItems.length === 0) return null;

    return (
      <div className="mb-4 sm:mb-6">
        {!isCollapsed && (
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
            {title}
          </h3>
        )}
        <div className="space-y-1">
          {filteredItems.map((item) => (
            <Button
              key={item.id}
              variant={sidebarHighlightPage === item.id ? "secondary" : "ghost"}
              className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start px-3'} h-9 sm:h-10 text-sm ${
                sidebarHighlightPage === item.id 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500' 
                  : item.locked 
                    ? 'text-muted-foreground/50 cursor-not-allowed opacity-60' 
                    : 'text-foreground/70 hover:bg-muted hover:text-foreground'
              }`}
              onClick={() => !item.locked && handleItemClick(item.id)}
              disabled={item.locked}
            >
              <item.icon className={`${isCollapsed ? '' : 'mr-3'} h-4 w-4 flex-shrink-0`} />
              {!isCollapsed && (
                <span className="flex items-center gap-2">
                  {item.label}
                  {item.locked && <Lock className="h-3 w-3" />}
                </span>
              )}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Mobile & Tablet Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" 
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 lg:relative
        ${isCollapsed ? 'w-16' : 'w-72 sm:w-80 lg:w-72'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
        transform transition-all duration-300 ease-in-out lg:transform-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col h-screen
        overflow-hidden
        pt-safe-top pb-safe-bottom
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
          {!isCollapsed && (
            <div className="flex items-center justify-start space-x-2 min-w-0 flex-1">
              <img 
                src={selectedInstitute?.logo || surakshaLogoSidebar} 
                alt={selectedInstitute?.logo ? "Institute logo" : "SurakshaLMS logo"}
                className="h-12 w-12 object-contain rounded flex-shrink-0"
              />
              <span className="font-bold text-base sm:text-lg text-gray-900 dark:text-white truncate">
                {selectedInstitute?.shortName || 'SurakshaLMS'}
              </span>
            </div>
          )}
          <div className={`flex items-center space-x-1 ${isCollapsed ? 'w-full justify-center' : ''}`}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  onClose();
                } else {
                  setIsCollapsed(!isCollapsed);
                }
              }}
              className="h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <X className="h-4 w-4 lg:hidden" />
              <Menu className="h-4 w-4 hidden lg:block" />
            </Button>
          </div>
        </div>

        {/* Context Info - Child-only on child routes, otherwise full context like before */}
        {!isCollapsed && (currentPage.startsWith('child/:childId/') && selectedChild ? (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Current Selection</span>
              <Button variant="ghost" size="sm" onClick={handleBackNavigation} className="h-6 w-6 p-0 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800" aria-label="Go Back">
                <ArrowLeft className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-1 text-xs">
              <div className="text-blue-600 dark:text-blue-400">
                <span className="font-medium">Child:</span>
                <span className="ml-1 truncate">{(selectedChild as any).name || (selectedChild?.user ? `${selectedChild.user.firstName} ${selectedChild.user.lastName}` : 'Unknown Child')}</span>
              </div>
            </div>
          </div>
        ) : (
          user?.role !== 'SystemAdmin' && (selectedInstitute || selectedClass || selectedSubject || selectedChild || selectedOrganization || selectedTransport) && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Current Selection</span>
                <Button variant="ghost" size="sm" onClick={handleBackNavigation} className="h-6 w-6 p-0 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800" aria-label="Go Back">
                  <ArrowLeft className="h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-1 text-xs">
                {selectedTransport && (
                  <div className="text-blue-600 dark:text-blue-400"><span className="font-medium">Transport:</span> <span className="ml-1 truncate">{selectedTransport.vehicleNumber}</span></div>
                )}
                {selectedOrganization && (
                  <div className="text-blue-600 dark:text-blue-400"><span className="font-medium">Organization:</span> <span className="ml-1 truncate">{selectedOrganization.name}</span></div>
                )}
                {selectedInstitute && (
                  <div className="text-blue-600 dark:text-blue-400">
                    <span className="font-medium">Institute:</span>
                    <span className="ml-1 text-sm font-semibold break-words whitespace-normal leading-snug">{selectedInstitute.name}</span>
                  </div>
                )}
                {selectedClass && (
                  <div className="text-blue-600 dark:text-blue-400"><span className="font-medium">Class:</span> <span className="ml-1 truncate">{selectedClass.name}</span></div>
                )}
                {selectedSubject && (
                  <div className="text-blue-600 dark:text-blue-400"><span className="font-medium">Subject:</span> <span className="ml-1 truncate">{selectedSubject.name}</span></div>
                )}
                {selectedChild && (
                  <div className="text-blue-600 dark:text-blue-400">
                    <span className="font-medium">Child:</span>
                    <span className="ml-1 text-sm font-semibold break-words whitespace-normal leading-snug">
                      {selectedChild?.user?.nameWithInitials ||
                        [selectedChild?.user?.firstName, selectedChild?.user?.lastName].filter(Boolean).join(' ') ||
                        `#${selectedChild.id}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        ))}

        {/* Navigation */}
        <ScrollArea className="flex-1 px-2 sm:px-3 py-3 sm:py-4">
          <div className="space-y-2">
            {selectedChild ? (
              <SidebarSection title="Select Institute" items={childItemsDisplay} />
            ) : currentPage === 'transport-attendance' ? (
              /* Show ONLY attendance section for transport attendance page */
              <SidebarSection title="Attendance" items={[
                {
                  id: 'transport-attendance',
                  label: 'Attendance',
                  icon: UserCheck,
                  permission: 'view-dashboard',
                  alwaysShow: true
                }
              ]} />
            ) : (
              <>
                {/* Show Main navigation items ONLY when institute is selected */}
                {selectedInstitute && (
                  <>
                    <SidebarSection title="Main" items={menuItemsDisplay.filter(item => !item.hasOwnProperty('section'))} />
                    
                    {/* Main's section for items with section property */}
                    {menuItemsDisplay.some(item => (item as any).section === "Main's") && (
                      <SidebarSection title="Main's" items={menuItemsDisplay.filter(item => (item as any).section === "Main's")} />
                    )}
                  </>
                )}
                
                {/* Show sections without "Main" label when no institute selected */}
                {!selectedInstitute && menuItemsDisplay.length > 0 && (
                  <SidebarSection title="Select Institute" items={menuItemsDisplay.filter(item => !item.hasOwnProperty('section'))} />
                )}
                
                {/* Show attendance section for Teacher based on selection state */}
                {userRole === 'Teacher' && attendanceItemsDisplay.length > 0 && (
                  <SidebarSection title="Attendance" items={attendanceItemsDisplay} />
                )}
                
                {/* Show attendance section when institute is selected for InstituteAdmin */}
                {userRole === 'InstituteAdmin' && selectedInstitute && (
                  <SidebarSection title="Attendance" items={attendanceItemsDisplay} />
                )}
                
                {/* For AttendanceMarker role, only show Mark Attendance when institute is selected */}
                {userRole === 'AttendanceMarker' && selectedInstitute && (
                  <SidebarSection title="Attendance" items={attendanceItemsDisplay} />
                )}
                
                {/* For other roles, show attendance navigation based on role */}
                {userRole !== 'AttendanceMarker' && userRole !== 'InstituteAdmin' && userRole !== 'Teacher' && userRole !== 'Student' && selectedInstitute && (
                  <SidebarSection title="Attendance" items={attendanceItemsDisplay} />
                )}
                
                {/* Show academic items for Teacher only when institute, class and subject are all selected */}
                {userRole === 'Teacher' && systemItemsDisplay.length > 0 && (
                  <SidebarSection title="Academic" items={systemItemsDisplay} />
                )}
                
                {/* Show academic items for InstituteAdmin only when institute, class and subject are all selected */}
                {userRole === 'InstituteAdmin' && selectedInstitute && selectedClass && selectedSubject && (
                  <SidebarSection title="Academic" items={systemItemsDisplay} />
                )}
                
                {/* Show full academic section for other roles (excluding Student) */}
                {selectedInstitute && userRole !== 'AttendanceMarker' && userRole !== 'InstituteAdmin' && userRole !== 'Teacher' && userRole !== 'Student' && (
                  <SidebarSection title="Academic" items={systemItemsDisplay} />
                )}
                
                {/* Show My Children section before institute selection for Parents */}
                {myChildrenItemsDisplay.length > 0 && (
                  <SidebarSection title="My Children" items={myChildrenItemsDisplay} />
                )}
                
                {/* Show Child specific navigation when child is selected */}
                {childItemsDisplay.length > 0 && (
                  <SidebarSection title="Child Sections" items={childItemsDisplay} />
                )}
                
                {/* Show System Payments section before institute selection */}
                {systemPaymentItemsDisplay.length > 0 && (
                  <SidebarSection title="System Payments" items={systemPaymentItemsDisplay} />
                )}
                
                {/* Show Payment section for specific user types based on new rules */}
                {paymentItemsDisplay.length > 0 && (
                  <SidebarSection title="Payments" items={paymentItemsDisplay} />
                )}
                
                {smsItemsDisplay.length > 0 && (
                  <SidebarSection title="SMS" items={smsItemsDisplay} />
                )}
                
                {/* Notifications Section - before Settings */}
                {notificationItemsDisplay.length > 0 && (
                  <SidebarSection 
                    title={selectedInstitute ? "Institute Notifications" : "Notifications"} 
                    items={notificationItemsDisplay} 
                  />
                )}
                
                <SidebarSection title="Settings" items={settingsItemsDisplay} />
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700">
          {!isCollapsed && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3 space-y-1">
              <div className="truncate">
                <span>Logged in as:</span> 
                <span className="font-medium ml-1">{user?.name}</span>
              </div>
              <div>
                <span>Role:</span> 
                <span className="font-medium ml-1">{userRole}</span>
              </div>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-center gap-2'} text-sm hover:bg-destructive hover:text-destructive-foreground hover:border-destructive h-8 sm:h-9 transition-colors`}
          >
            <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
            {!isCollapsed && <span className="text-xs sm:text-sm">Logout</span>}
          </Button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
