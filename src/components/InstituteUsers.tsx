
import React, { useState, useRef, useCallback } from 'react';
import * as MUI from '@mui/material';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import { getImageUrl } from '@/utils/imageUrlHelper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, RefreshCw, GraduationCap, Users, UserCheck, Plus, UserPlus, UserCog, Filter, Search, Shield, Upload, CheckCircle, UserX, UserMinus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { instituteApi } from '@/api/institute.api';
import { studentsApi } from '@/api/students.api';
import { useApiRequest } from '@/hooks/useApiRequest';
import { useTableData } from '@/hooks/useTableData';
import CreateUserForm from '@/components/forms/CreateUserForm';
import CreateComprehensiveUserForm from '@/components/forms/CreateComprehensiveUserForm';
import AssignUserForm from '@/components/forms/AssignUserForm';
import AssignParentForm from '@/components/forms/AssignParentForm';
import AssignParentByPhoneForm from '@/components/forms/AssignParentByPhoneForm';
import AssignUserMethodsDialog from '@/components/forms/AssignUserMethodsDialog';
import { usersApi, BasicUser } from '@/api/users.api';
import UserInfoDialog from '@/components/forms/UserInfoDialog';
import UserOrganizationsDialog from '@/components/forms/UserOrganizationsDialog';
import { getBaseUrl } from '@/contexts/utils/auth.api';
import ImagePreviewModal from '@/components/ImagePreviewModal';
import StudentDetailsDialog from '@/components/forms/StudentDetailsDialog';
import { uploadWithSignedUrl } from '@/utils/signedUploadHelper';
import InstituteUsersFilters, { InstituteUserFilterParams } from '@/components/InstituteUsersFilters';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface InstituteUserData {
  id: string;
  name: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  phoneNumber?: string;
  imageUrl?: string;
  instituteUserImageUrl?: string;
  dateOfBirth?: string;
  userIdByInstitute?: string | null;
  verifiedBy?: string | null;
  fatherId?: string;
  motherId?: string;
  guardianId?: string;
  studentId?: string;
  emergencyContact?: string;
  medicalConditions?: string;
  allergies?: string;
  father?: {
    id: string;
    name: string;
    email?: string;
    occupation?: string;
    workPlace?: string;
    children?: any[];
  };
}

interface InstituteUsersResponse {
  data: InstituteUserData[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

type UserType = 'STUDENT' | 'TEACHER' | 'ATTENDANCE_MARKER' | 'INSTITUTE_ADMIN' | 'INACTIVE';

const InstituteUsers = () => {
  const { toast } = useToast();
  const { user, currentInstituteId } = useAuth();
  
  const [selectedUser, setSelectedUser] = useState<InstituteUserData | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [showCreateComprehensiveUserDialog, setShowCreateComprehensiveUserDialog] = useState(false);
  const [showAssignUserDialog, setShowAssignUserDialog] = useState(false);
  const [showAssignMethodsDialog, setShowAssignMethodsDialog] = useState(false);
  const [showAssignParentDialog, setShowAssignParentDialog] = useState(false);
  const [selectedStudentForParent, setSelectedStudentForParent] = useState<InstituteUserData | null>(null);
  const [assignInitialUserId, setAssignInitialUserId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<UserType>('STUDENT');
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  
  // Filter state for each user type
  const [studentFilters, setStudentFilters] = useState<InstituteUserFilterParams>({ parent: 'true' } as any);
  const [teacherFilters, setTeacherFilters] = useState<InstituteUserFilterParams>({});
  const [markerFilters, setMarkerFilters] = useState<InstituteUserFilterParams>({});
  const [adminFilters, setAdminFilters] = useState<InstituteUserFilterParams>({});
  const [inactiveFilters, setInactiveFilters] = useState<InstituteUserFilterParams>({});
  const [userInfoDialog, setUserInfoDialog] = useState<{ open: boolean; user: BasicUser | null }>({
    open: false,
    user: null,
  });
  const [uploadingUserId, setUploadingUserId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [selectedUserForOrg, setSelectedUserForOrg] = useState<{ id: string; name: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: ''
  });
  const [studentDetailsDialog, setStudentDetailsDialog] = useState<{ open: boolean; student: InstituteUserData | null }>({
    open: false,
    student: null
  });
  
  // Crop state for image upload
  const [cropImgSrc, setCropImgSrc] = useState('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const imgRef = useRef<HTMLImageElement>(null);
  
  // 35mm x 45mm = 7:9 aspect ratio
  const PASSPORT_ASPECT_RATIO = 7 / 9;
  
  // Loading states for individual button actions
  const [activatingUserId, setActivatingUserId] = useState<string | null>(null);
  const [deactivatingUserId, setDeactivatingUserId] = useState<string | null>(null);

  // Get current filters based on active tab
  const getCurrentFilters = () => {
    switch (activeTab) {
      case 'STUDENT': return studentFilters;
      case 'TEACHER': return teacherFilters;
      case 'ATTENDANCE_MARKER': return markerFilters;
      case 'INSTITUTE_ADMIN': return adminFilters;
      case 'INACTIVE': return inactiveFilters;
      default: return studentFilters;
    }
  };

  const setCurrentFilters = (filters: InstituteUserFilterParams) => {
    switch (activeTab) {
      case 'STUDENT': setStudentFilters(filters); break;
      case 'TEACHER': setTeacherFilters(filters); break;
      case 'ATTENDANCE_MARKER': setMarkerFilters(filters); break;
      case 'INSTITUTE_ADMIN': setAdminFilters(filters); break;
      case 'INACTIVE': setInactiveFilters(filters); break;
    }
  };

  // Table data management for each user type
  const studentsTable = useTableData<InstituteUserData>({
    endpoint: `/institute-users/institute/${currentInstituteId}/users/STUDENT`,
    defaultParams: { parent: 'true', ...studentFilters },
    dependencies: [], // Remove dependencies to prevent auto-reloading
    pagination: { defaultLimit: 50, availableLimits: [25, 50, 100] },
    autoLoad: true // Enable auto-loading from cache
  });

  const teachersTable = useTableData<InstituteUserData>({
    endpoint: `/institute-users/institute/${currentInstituteId}/users/TEACHER`,
    defaultParams: teacherFilters,
    dependencies: [], // Remove dependencies to prevent auto-reloading
    pagination: { defaultLimit: 50, availableLimits: [25, 50, 100] },
    autoLoad: true // Enable auto-loading from cache
  });

  const attendanceMarkersTable = useTableData<InstituteUserData>({
    endpoint: `/institute-users/institute/${currentInstituteId}/users/ATTENDANCE_MARKER`,
    defaultParams: markerFilters,
    dependencies: [], // Remove dependencies to prevent auto-reloading
    pagination: { defaultLimit: 50, availableLimits: [25, 50, 100] },
    autoLoad: true // Enable auto-loading from cache
  });

  const instituteAdminsTable = useTableData<InstituteUserData>({
    endpoint: `/institute-users/institute/${currentInstituteId}/users/INSTITUTE_ADMIN`,
    defaultParams: adminFilters,
    dependencies: [], // Remove dependencies to prevent auto-reloading
    pagination: { defaultLimit: 50, availableLimits: [25, 50, 100] },
    autoLoad: true // Enable auto-loading from cache
  });

  const inactiveUsersTable = useTableData<InstituteUserData>({
    endpoint: `/institute-users/institute/${currentInstituteId}/users/inactive`,
    defaultParams: inactiveFilters,
    dependencies: [], // Remove dependencies to prevent auto-reloading
    pagination: { defaultLimit: 50, availableLimits: [25, 50, 100] },
    autoLoad: true // Enable auto-loading from cache
  });

  // Use API request hook for creating users with duplicate prevention
  const createUserRequest = useApiRequest(
    async (userData: any) => {
      console.log('Creating user with data:', userData);
      // This would need to be implemented based on your API structure
      const response = await fetch(`/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      return response.json();
    },
    { preventDuplicates: true, showLoading: false }
  );

  const handleViewUser = (user: InstituteUserData) => {
    setSelectedUser(user);
    setShowUserDialog(true);
  };
  const handleViewBasicUser = async (id?: string | null) => {
    if (!id) return;
    try {
      const info = await usersApi.getBasicInfo(id);
      setUserInfoDialog({ open: true, user: info });
    } catch (error: any) {
      console.error('Error fetching user basic info:', error);
      toast({
        title: 'Failed to load user',
        description: error?.message || 'Could not fetch user information',
        variant: 'destructive',
        duration: 1500
      });
    }
  };

  const handleCreateUser = async (userData: any) => {
    console.log('User created successfully:', userData);
    setShowCreateUserDialog(false);
    
    // If API returned assignment-related shape, auto-open Assign dialog with prefilled userId
    if (userData && typeof userData.success === 'boolean' && userData.user?.id) {
      setAssignInitialUserId(userData.user.id);
      setShowAssignUserDialog(true);
    }
    
    toast({
      title: "User Created",
      description: "User has been created successfully.",
      duration: 1500
    });
  };

  const handleAssignUser = async (assignData: any) => {
    console.log('User assigned successfully:', assignData);
    setShowAssignUserDialog(false);
    
    toast({
      title: "User Assigned",
      description: "User has been assigned to institute successfully.",
      duration: 1500
    });
    
    // Refresh the current tab data
    getCurrentTable().actions.refresh();
  };

  const handleAssignParent = (student: InstituteUserData) => {
    setSelectedStudentForParent(student);
    setShowAssignParentDialog(true);
  };

  const handleParentAssignment = async (data: any) => {
    // The API call is handled by the form component
    // This function just handles the success response
    setShowAssignParentDialog(false);
    setSelectedStudentForParent(null);
    
    // Refresh students data
    studentsTable.actions.refresh();
  };

  const centerAspectCrop = useCallback((mediaWidth: number, mediaHeight: number, aspect: number) => {
    return centerCrop(
      makeAspectCrop(
        { unit: '%', width: 70 },
        aspect,
        mediaWidth,
        mediaHeight,
      ),
      mediaWidth,
      mediaHeight,
    );
  }, []);

  const onCropImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, PASSPORT_ASPECT_RATIO));
  }, [centerAspectCrop, PASSPORT_ASPECT_RATIO]);

  const getCroppedImg = useCallback(
    (image: HTMLImageElement, cropData: PixelCrop): Promise<Blob> => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('No 2d context');

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;
      const pixelRatio = window.devicePixelRatio;

      canvas.width = Math.floor(cropData.width * scaleX * pixelRatio);
      canvas.height = Math.floor(cropData.height * scaleY * pixelRatio);

      ctx.scale(pixelRatio, pixelRatio);
      ctx.imageSmoothingQuality = 'high';

      const cropX = cropData.x * scaleX;
      const cropY = cropData.y * scaleY;

      ctx.save();
      ctx.translate(-cropX, -cropY);
      ctx.drawImage(
        image,
        0, 0,
        image.naturalWidth, image.naturalHeight,
        0, 0,
        image.naturalWidth, image.naturalHeight,
      );
      ctx.restore();

      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Canvas is empty')); return; }
          resolve(blob);
        }, 'image/png');
      });
    },
    [],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setCrop(undefined);
      setCompletedCrop(undefined);
      const reader = new FileReader();
      reader.addEventListener('load', () => setCropImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async (userId: string) => {
    if (!completedCrop || !imgRef.current || !currentInstituteId) return;

    setUploading(true);
    try {
      // Get cropped image blob
      const croppedBlob = await getCroppedImg(imgRef.current, completedCrop);
      
      // Create file from blob
      const croppedFile = new File([croppedBlob], 'cropped-image.png', { type: 'image/png' });
      
      // Step 1: Upload file using signed URL and get relativePath
      console.log('Step 1: Getting signed URL and uploading file...');
      const relativePath = await uploadWithSignedUrl(
        croppedFile,
        'institute-user-images',
        (message, progress) => {
          console.log(`Upload progress: ${progress}% - ${message}`);
        }
      );
      console.log('Step 1 complete. RelativePath:', relativePath);

      // Step 2: Send relativePath as imageUrl to backend
      console.log('Step 2: Sending relativePath to backend...');
      const token = localStorage.getItem('access_token');
      const requestBody = { imageUrl: relativePath };
      console.log('Request body:', requestBody);
      
      const response = await fetch(
        `${getBaseUrl()}/institute-users/institute/${currentInstituteId}/users/${userId}/upload-image`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Success response:', result);
      
      toast({
        title: "Success",
        description: result.message || "Image uploaded successfully",
        duration: 1500
      });

      handleCloseUploadDialog();
      getCurrentTable().actions.refresh();
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload image",
        variant: "destructive",
        duration: 1500
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCloseUploadDialog = () => {
    setUploadingUserId(null);
    setSelectedImage(null);
    setCropImgSrc('');
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  const handleActivateUser = async (userId: string) => {
    if (!currentInstituteId) return;
    
    setActivatingUserId(userId);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${getBaseUrl()}/institute-users/institute/${currentInstituteId}/users/${userId}/activate`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to activate user');
      }

      const result = await response.json();
      
      toast({
        title: "Success",
        description: result.message || "User activated successfully",
        duration: 1500
      });

      // Refresh both inactive and active tables
      inactiveUsersTable.actions.refresh();
      getCurrentTable().actions.refresh();
    } catch (error: any) {
      console.error('Error activating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to activate user",
        variant: "destructive",
        duration: 1500
      });
    } finally {
      setActivatingUserId(null);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (!currentInstituteId) return;
    
    setDeactivatingUserId(userId);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${getBaseUrl()}/institute-users/institute/${currentInstituteId}/users/${userId}/deactivate`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to deactivate user');
      }

      const result = await response.json();
      
      toast({
        title: "Success",
        description: result.message || "User deactivated successfully",
        duration: 1500
      });

      // Refresh the current table
      getCurrentTable().actions.refresh();
    } catch (error: any) {
      console.error('Error deactivating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate user",
        variant: "destructive",
        duration: 1500
      });
    } finally {
      setDeactivatingUserId(null);
    }
  };

  const getCurrentTable = () => {
    switch (activeTab) {
      case 'STUDENT':
        return studentsTable;
      case 'TEACHER':
        return teachersTable;
      case 'ATTENDANCE_MARKER':
        return attendanceMarkersTable;
      case 'INSTITUTE_ADMIN':
        return instituteAdminsTable;
      case 'INACTIVE':
        return inactiveUsersTable;
      default:
        return studentsTable;
    }
  };

  // Prevent unnecessary API calls on repeated clicks.
  const safeLoad = (table: any) => {
    if (!table || table.state?.loading) return;
    // If already loaded once and no explicit refresh requested, skip
    if (table.state?.lastRefresh && (table.state?.data?.length || 0) > 0) return;
    table.actions?.loadData?.(false);
  };

  const getCurrentUsers = () => {
    return getCurrentTable().state.data;
  };

  const handleFiltersChange = (newFilters: InstituteUserFilterParams) => {
    setCurrentFilters(newFilters);
  };

  const handleApplyFilters = async () => {
    setIsApplyingFilters(true);
    const currentFilters = getCurrentFilters();
    const currentTable = getCurrentTable();
    
    try {
      // Update filters and immediately trigger API call
      currentTable.actions.updateFilters(currentFilters);
      await currentTable.actions.refresh();
    } finally {
      setIsApplyingFilters(false);
    }
  };

  const handleClearFilters = () => {
    setCurrentFilters({});
    getCurrentTable().actions.updateFilters({});
  };

  const getUserTypeLabel = (type: UserType) => {
    switch (type) {
      case 'STUDENT':
        return 'Students';
      case 'TEACHER':
        return 'Teachers';
      case 'ATTENDANCE_MARKER':
        return 'Attendance Markers';
      case 'INSTITUTE_ADMIN':
        return 'Institute Admins';
      case 'INACTIVE':
        return 'Inactive Users';
      default:
        return '';
    }
  };

  const getUserTypeIcon = (type: UserType) => {
    switch (type) {
      case 'STUDENT':
        return GraduationCap;
      case 'TEACHER':
        return Users;
      case 'ATTENDANCE_MARKER':
        return UserCheck;
      case 'INSTITUTE_ADMIN':
        return Shield;
      case 'INACTIVE':
        return UserX;
      default:
        return Users;
    }
  };

  const userRole = useInstituteRole();

  if (userRole !== 'InstituteAdmin') {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Access denied. InstituteAdmin role required.</p>
      </div>
    );
  }

  if (!currentInstituteId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Please select an institute first.</p>
      </div>
    );
  }

  const currentTable = getCurrentTable();
  const currentUsers = getCurrentUsers();
  const currentLoading = currentTable.state.loading;
  const IconComponent = getUserTypeIcon(activeTab);

  return (
    <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Institute Users</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage users in your institute
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={() => setShowAssignMethodsDialog(true)}
            variant="outline"
            className="flex items-center gap-2 flex-1 sm:flex-none"
            size="sm"
          >
            <UserPlus className="h-4 w-4" />
            Assign User
          </Button>
          <Button 
            onClick={() => setShowCreateComprehensiveUserDialog(true)}
            className="flex items-center gap-2 flex-1 sm:flex-none"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Create User
          </Button>
        </div>
      </div>

      {/* Filters Component */}
      <InstituteUsersFilters
        filters={getCurrentFilters()}
        onFiltersChange={handleFiltersChange}
        onApplyFilters={handleApplyFilters}
        onClearFilters={handleClearFilters}
        userType={activeTab}
        isApplying={isApplyingFilters}
      />

      {/* Tabs for different user types */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as UserType)}>
        {/* Mobile: Horizontal scrollable tabs - icon only, name shows when active */}
        <div className="lg:hidden overflow-x-auto">
          <TabsList className="inline-flex h-auto w-auto gap-2 p-1.5 bg-background border rounded-lg">
            <TabsTrigger 
              value="STUDENT" 
              className="flex items-center gap-2 px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md whitespace-nowrap data-[state=inactive]:px-2"
            >
              <GraduationCap className="h-4 w-4" />
              {activeTab === 'STUDENT' && <span className="text-sm">Students</span>}
            </TabsTrigger>
            <TabsTrigger 
              value="TEACHER" 
              className="flex items-center gap-2 px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md whitespace-nowrap data-[state=inactive]:px-2"
            >
              <Users className="h-4 w-4" />
              {activeTab === 'TEACHER' && <span className="text-sm">Teachers</span>}
            </TabsTrigger>
            <TabsTrigger 
              value="ATTENDANCE_MARKER" 
              className="flex items-center gap-2 px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md whitespace-nowrap data-[state=inactive]:px-2"
            >
              <UserCheck className="h-4 w-4" />
              {activeTab === 'ATTENDANCE_MARKER' && <span className="text-sm">Markers</span>}
            </TabsTrigger>
            <TabsTrigger 
              value="INSTITUTE_ADMIN" 
              className="flex items-center gap-2 px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md whitespace-nowrap data-[state=inactive]:px-2"
            >
              <Shield className="h-4 w-4" />
              {activeTab === 'INSTITUTE_ADMIN' && <span className="text-sm">Admins</span>}
            </TabsTrigger>
            <TabsTrigger 
              value="INACTIVE" 
              className="flex items-center gap-2 px-3 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md whitespace-nowrap data-[state=inactive]:px-2"
            >
              <UserX className="h-4 w-4" />
              {activeTab === 'INACTIVE' && <span className="text-sm">Inactive</span>}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Desktop: Full width tabs with text */}
        <div className="hidden lg:block">
          <TabsList className="grid w-full grid-cols-5 gap-2 p-2 h-auto bg-muted/50">
            <TabsTrigger 
              value="STUDENT" 
              className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <GraduationCap className="h-4 w-4" />
              <span>Students</span>
            </TabsTrigger>
            <TabsTrigger 
              value="TEACHER" 
              className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Users className="h-4 w-4" />
              <span>Teachers</span>
            </TabsTrigger>
            <TabsTrigger 
              value="ATTENDANCE_MARKER" 
              className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <UserCheck className="h-4 w-4" />
              <span>Markers</span>
            </TabsTrigger>
            <TabsTrigger 
              value="INSTITUTE_ADMIN" 
              className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Shield className="h-4 w-4" />
              <span>Admins</span>
            </TabsTrigger>
            <TabsTrigger 
              value="INACTIVE" 
              className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <UserX className="h-4 w-4" />
              <span>Inactive</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="STUDENT" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <GraduationCap className="h-4 w-4" />
                {studentsTable.pagination.totalCount} Students
              </Badge>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button 
                onClick={() => studentsTable.actions.refresh()} 
                disabled={studentsTable.state.loading}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
              >
                {studentsTable.state.loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    <span className="hidden sm:inline">Loading...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Load Students</span>
                    <span className="sm:hidden">Load</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="TEACHER" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {teachersTable.pagination.totalCount} Teachers
              </Badge>
            </div>
            <Button 
              onClick={() => teachersTable.actions.refresh()} 
              disabled={teachersTable.state.loading}
              variant="outline"
              size="sm"
            >
              {teachersTable.state.loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Load Teachers
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="ATTENDANCE_MARKER" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <UserCheck className="h-4 w-4" />
                {attendanceMarkersTable.pagination.totalCount} Attendance Markers
              </Badge>
            </div>
            <Button 
              onClick={() => attendanceMarkersTable.actions.refresh()} 
              disabled={attendanceMarkersTable.state.loading}
              variant="outline"
              size="sm"
            >
              {attendanceMarkersTable.state.loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Load Attendance Markers
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="INSTITUTE_ADMIN" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                {instituteAdminsTable.pagination.totalCount} Institute Admins
              </Badge>
            </div>
            <Button 
              onClick={() => instituteAdminsTable.actions.refresh()} 
              disabled={instituteAdminsTable.state.loading}
              variant="outline"
              size="sm"
            >
              {instituteAdminsTable.state.loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Load Institute Admins
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="INACTIVE" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="flex items-center gap-1">
                <UserX className="h-4 w-4" />
                {inactiveUsersTable.pagination.totalCount} Inactive Users
              </Badge>
            </div>
            <Button 
              onClick={() => inactiveUsersTable.actions.refresh()} 
              disabled={inactiveUsersTable.state.loading}
              variant="outline"
              size="sm"
            >
              {inactiveUsersTable.state.loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Load Inactive Users
                </>
              )}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Users MUI Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ height: 'calc(100vh - 280px)' }}>
          <Table stickyHeader aria-label="users table">
            <TableHead>
              <TableRow>
                <TableCell>Image</TableCell>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone Number</TableCell>
                <TableCell>Institute ID</TableCell>
                <TableCell>Org</TableCell>
                <TableCell>Upload</TableCell>
                {activeTab === 'STUDENT' && <TableCell>Parent</TableCell>}
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentUsers.map((userData) => (
                <TableRow hover role="checkbox" tabIndex={-1} key={userData.id}>
                  <TableCell>
                    <div 
                      className="cursor-pointer flex justify-center"
                      onClick={() => {
                        if (userData.imageUrl) {
                          setImagePreview({ 
                            isOpen: true, 
                            url: userData.imageUrl, 
                            title: userData.name 
                          });
                        }
                      }}
                    >
                      <Avatar className="h-10 w-10 md:h-12 md:w-12 lg:h-14 lg:w-14 hover:opacity-80 transition-opacity border-2 border-border">
                        <AvatarImage src={getImageUrl(userData.imageUrl || '')} alt={userData.name} className="object-cover" />
                        <AvatarFallback className="bg-muted">
                          {userData.name.split(' ').map(n => n.charAt(0)).join('').slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{userData.id}</span>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{userData.name}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{userData.email || 'Not provided'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{userData.phoneNumber || 'Not provided'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-sm">{userData.userIdByInstitute || 'Not assigned'}</span>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        setSelectedUserForOrg({ id: userData.id, name: userData.name });
                        setOrgDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                  <TableCell>
                    {userData.instituteUserImageUrl ? (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-600 text-white">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Uploaded
                      </Badge>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setUploadingUserId(userData.id)}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Upload
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  {activeTab === 'STUDENT' && (
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAssignParent(userData)}
                      >
                        <UserCog className="h-4 w-4 mr-1" />
                        Assign Parent
                      </Button>
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex gap-2">
                      {activeTab === 'STUDENT' ? (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => setStudentDetailsDialog({ open: true, student: userData })}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleViewUser(userData)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      )}
                      {activeTab === 'INACTIVE' ? (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleActivateUser(userData.id)}
                          disabled={activatingUserId === userData.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {activatingUserId === userData.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <UserCheck className="h-4 w-4 mr-1" />
                          )}
                          {activatingUserId === userData.id ? 'Activating...' : 'Activate'}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeactivateUser(userData.id)}
                          disabled={deactivatingUserId === userData.id}
                        >
                          {deactivatingUserId === userData.id ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <UserMinus className="h-4 w-4 mr-1" />
                          )}
                          {deactivatingUserId === userData.id ? 'Deactivating...' : 'Deactivate'}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {currentUsers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={activeTab === 'STUDENT' ? 10 : (activeTab === 'INACTIVE' ? 9 : 9)} align="center">
                    <div className="py-12 text-center text-gray-500">
                      <IconComponent className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No {getUserTypeLabel(activeTab).toLowerCase()}</p>
                      <p className="text-sm">No users found for the current selection</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={currentTable.availableLimits}
          component="div"
          count={currentTable.pagination.totalCount}
          rowsPerPage={currentTable.pagination.limit}
          page={currentTable.pagination.page}
          onPageChange={(event: unknown, newPage: number) => currentTable.actions.setPage(newPage)}
          onRowsPerPageChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            currentTable.actions.setLimit(parseInt(event.target.value, 10));
            currentTable.actions.setPage(0);
          }}
        />
      </Paper>

      {/* Pagination */}
      {currentTable.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {((currentTable.pagination.page) * currentTable.pagination.limit) + 1} to {Math.min((currentTable.pagination.page + 1) * currentTable.pagination.limit, currentTable.pagination.totalCount)} of {currentTable.pagination.totalCount} {activeTab.toLowerCase()}s
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => currentTable.actions.prevPage()}
              disabled={currentTable.pagination.page === 0 || currentTable.state.loading}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentTable.pagination.page + 1} of {currentTable.pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => currentTable.actions.nextPage()}
              disabled={currentTable.pagination.page === currentTable.pagination.totalPages - 1 || currentTable.state.loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {currentUsers.length === 0 && !currentLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <IconComponent className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No {getUserTypeLabel(activeTab)} Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              No {activeTab.toLowerCase().replace('_', ' ')}s found in this institute. Click the button above to load data.
            </p>
          </CardContent>
        </Card>
      )}

      {/* User Details Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{getUserTypeLabel(activeTab).slice(0, -1)} Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={getImageUrl(selectedUser.imageUrl || '')} alt={selectedUser.name} />
                  <AvatarFallback className="text-lg">
                    {selectedUser.name.split(' ').map(n => n.charAt(0)).join('').slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{selectedUser.name}</h3>
                  <p className="text-gray-600">{selectedUser.email || 'N/A'}</p>
                  <Badge variant="outline">{activeTab.replace('_', ' ')}</Badge>
                </div>
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">User ID</label>
                  <p className="text-sm">{selectedUser.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone Number</label>
                  <p className="text-sm">{selectedUser.phoneNumber || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                  <p className="text-sm">{selectedUser.dateOfBirth ? new Date(selectedUser.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Institute User ID</label>
                  <p className="text-sm">{selectedUser.userIdByInstitute || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Verified By</label>
                  <p className="text-sm">{selectedUser.verifiedBy || 'N/A'}</p>
                </div>
              </div>

              {/* Address Information */}
              <div>
                <h4 className="text-lg font-medium mb-3">Address Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Address Line 1</label>
                    <p className="text-sm">{selectedUser.addressLine1 || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Address Line 2</label>
                    <p className="text-sm">{selectedUser.addressLine2 || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Family Information (Students only) */}
              {activeTab === 'STUDENT' && (selectedUser.fatherId || selectedUser.motherId || selectedUser.guardianId) && (
                <div>
                  <h4 className="text-lg font-medium mb-3">Family Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedUser.fatherId && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center justify-between">
                          <span>Father ID</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 ml-2"
                            onClick={() => handleViewBasicUser(selectedUser.fatherId)}
                            aria-label="View father user details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </label>
                        <p className="text-sm mt-1">{selectedUser.fatherId}</p>
                      </div>
                    )}
                    {selectedUser.motherId && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center justify-between">
                          <span>Mother ID</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 ml-2"
                            onClick={() => handleViewBasicUser(selectedUser.motherId)}
                            aria-label="View mother user details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </label>
                        <p className="text-sm mt-1">{selectedUser.motherId}</p>
                      </div>
                    )}
                    {selectedUser.guardianId && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center justify-between">
                          <span>Guardian ID</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 ml-2"
                            onClick={() => handleViewBasicUser(selectedUser.guardianId)}
                            aria-label="View guardian user details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </label>
                        <p className="text-sm mt-1">{selectedUser.guardianId}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <CreateUserForm
            onSubmit={handleCreateUser}
            onCancel={() => setShowCreateUserDialog(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Assign User Dialog */}
      <Dialog open={showAssignUserDialog} onOpenChange={setShowAssignUserDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign User to Institute</DialogTitle>
          </DialogHeader>
          <AssignUserForm
            instituteId={currentInstituteId!}
            onSubmit={handleAssignUser}
            onCancel={() => setShowAssignUserDialog(false)}
            initialUserId={assignInitialUserId}
          />
        </DialogContent>
      </Dialog>

      {/* Assign Parent Dialog */}
      <Dialog open={showAssignParentDialog} onOpenChange={setShowAssignParentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Parent to Student</DialogTitle>
          </DialogHeader>
          {selectedStudentForParent && (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Assigning parent to:</p>
              <p className="font-medium">{selectedStudentForParent.name}</p>
              <p className="text-sm text-muted-foreground">ID: {selectedStudentForParent.id}</p>
            </div>
          )}
          <AssignParentByPhoneForm
            studentId={selectedStudentForParent?.id || ''}
            onSubmit={handleParentAssignment}
            onCancel={() => {
              setShowAssignParentDialog(false);
              setSelectedStudentForParent(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Assign User Methods Dialog */}
      <AssignUserMethodsDialog
        open={showAssignMethodsDialog}
        onClose={() => setShowAssignMethodsDialog(false)}
        instituteId={currentInstituteId}
        onSuccess={() => {
          // Refresh the current tab data
          getCurrentTable().actions.refresh();
        }}
      />

      <UserInfoDialog 
        open={userInfoDialog.open}
        onClose={() => setUserInfoDialog({ open: false, user: null })}
        user={userInfoDialog.user}
      />

      {/* User Organizations Dialog */}
      {selectedUserForOrg && (
        <UserOrganizationsDialog
          open={orgDialogOpen}
          onOpenChange={setOrgDialogOpen}
          userId={selectedUserForOrg.id}
          userName={selectedUserForOrg.name}
        />
      )}

      {/* Create Comprehensive User Dialog */}
      {showCreateComprehensiveUserDialog && (
        <CreateComprehensiveUserForm
          onSubmit={(data) => {
            console.log('Comprehensive user created:', data);
            setShowCreateComprehensiveUserDialog(false);
            toast({
              title: "Success",
              description: data.message || "User created successfully!",
              duration: 1500
            });
            // Refresh the current tab data
            getCurrentTable().actions.refresh();
          }}
          onCancel={() => setShowCreateComprehensiveUserDialog(false)}
        />
      )}

      {/* Upload Image Dialog with Crop */}
      <Dialog open={!!uploadingUserId} onOpenChange={handleCloseUploadDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload User Image (35mm × 45mm)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Image</label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
              />
            </div>
            
            {cropImgSrc && (
              <div className="max-h-80 overflow-auto rounded-lg flex justify-center">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={PASSPORT_ASPECT_RATIO}
                  minWidth={50}
                  minHeight={50}
                  keepSelection
                  ruleOfThirds
                  style={{ maxHeight: '300px' }}
                >
                  <img
                    ref={imgRef}
                    alt="Crop preview"
                    src={cropImgSrc}
                    onLoad={onCropImageLoad}
                    style={{ maxHeight: '300px', maxWidth: '100%' }}
                  />
                </ReactCrop>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground text-center">
              Passport photo size: 35mm × 45mm (7:9 aspect ratio)
            </p>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleCloseUploadDialog}
            >
              Cancel
            </Button>
            <Button
              onClick={() => uploadingUserId && handleImageUpload(uploadingUserId)}
              disabled={!completedCrop || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImagePreviewModal
        isOpen={imagePreview.isOpen}
        onClose={() => setImagePreview({ isOpen: false, url: '', title: '' })}
        imageUrl={imagePreview.url}
        title={imagePreview.title}
      />

      {/* Student Details Dialog */}
      <StudentDetailsDialog
        open={studentDetailsDialog.open}
        onOpenChange={(open) => setStudentDetailsDialog({ open, student: null })}
        student={studentDetailsDialog.student}
      />
    </div>
  );
};

export default InstituteUsers;
