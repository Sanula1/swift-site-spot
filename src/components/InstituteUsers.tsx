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
import { Eye, RefreshCw, GraduationCap, Users, UserCheck, Plus, UserPlus, UserCog, Filter, Search, Shield, Upload, CheckCircle, UserX, UserMinus, Loader2, Clock, CheckCircle2, XCircle } from 'lucide-react';
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
type UserType = 'STUDENT' | 'TEACHER' | 'ATTENDANCE_MARKER' | 'INSTITUTE_ADMIN';
type ViewType = 'USERS' | 'PENDING' | 'INACTIVE';
const InstituteUsers = () => {
  const {
    toast
  } = useToast();
  const {
    user,
    currentInstituteId
  } = useAuth();
  const [selectedUser, setSelectedUser] = useState<InstituteUserData | null>(null);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [showCreateComprehensiveUserDialog, setShowCreateComprehensiveUserDialog] = useState(false);
  const [showAssignUserDialog, setShowAssignUserDialog] = useState(false);
  const [showAssignMethodsDialog, setShowAssignMethodsDialog] = useState(false);
  const [showAssignParentDialog, setShowAssignParentDialog] = useState(false);
  const [selectedStudentForParent, setSelectedStudentForParent] = useState<InstituteUserData | null>(null);
  const [assignInitialUserId, setAssignInitialUserId] = useState<string | undefined>(undefined);
  const [activeView, setActiveView] = useState<ViewType>('USERS');
  const [selectedUserType, setSelectedUserType] = useState<UserType>('STUDENT');
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);

  // Filter state for each user type
  const [studentFilters, setStudentFilters] = useState<InstituteUserFilterParams>({
    parent: 'true'
  } as any);
  const [teacherFilters, setTeacherFilters] = useState<InstituteUserFilterParams>({});
  const [markerFilters, setMarkerFilters] = useState<InstituteUserFilterParams>({});
  const [adminFilters, setAdminFilters] = useState<InstituteUserFilterParams>({});
  const [pendingFilters, setPendingFilters] = useState<InstituteUserFilterParams>({});
  const [inactiveFilters, setInactiveFilters] = useState<InstituteUserFilterParams>({});
  const [pendingUserType, setPendingUserType] = useState<'STUDENT' | 'TEACHER' | 'INSTITUTE_ADMIN' | 'ATTENDANCE_MARKER'>('STUDENT');
  const [verifyingIds, setVerifyingIds] = useState<Set<string>>(new Set());
  const [selectedPendingUsers, setSelectedPendingUsers] = useState<string[]>([]);
  const [bulkVerifying, setBulkVerifying] = useState(false);
  const [userInfoDialog, setUserInfoDialog] = useState<{
    open: boolean;
    user: BasicUser | null;
  }>({
    open: false,
    user: null
  });
  const [uploadingUserId, setUploadingUserId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);
  const [selectedUserForOrg, setSelectedUserForOrg] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [imagePreview, setImagePreview] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
  }>({
    isOpen: false,
    url: '',
    title: ''
  });
  const [studentDetailsDialog, setStudentDetailsDialog] = useState<{
    open: boolean;
    student: InstituteUserData | null;
  }>({
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

  // Get current filters based on active view and selected user type
  const getCurrentFilters = () => {
    if (activeView === 'USERS') {
      switch (selectedUserType) {
        case 'STUDENT':
          return studentFilters;
        case 'TEACHER':
          return teacherFilters;
        case 'ATTENDANCE_MARKER':
          return markerFilters;
        case 'INSTITUTE_ADMIN':
          return adminFilters;
        default:
          return studentFilters;
      }
    } else if (activeView === 'PENDING') {
      return pendingFilters;
    } else {
      return inactiveFilters;
    }
  };
  const setCurrentFilters = (filters: InstituteUserFilterParams) => {
    if (activeView === 'USERS') {
      switch (selectedUserType) {
        case 'STUDENT':
          setStudentFilters(filters);
          break;
        case 'TEACHER':
          setTeacherFilters(filters);
          break;
        case 'ATTENDANCE_MARKER':
          setMarkerFilters(filters);
          break;
        case 'INSTITUTE_ADMIN':
          setAdminFilters(filters);
          break;
      }
    } else if (activeView === 'PENDING') {
      setPendingFilters(filters);
    } else {
      setInactiveFilters(filters);
    }
  };

  // Table data management for each user type
  const studentsTable = useTableData<InstituteUserData>({
    endpoint: `/institute-users/institute/${currentInstituteId}/users/STUDENT`,
    defaultParams: {
      parent: 'true',
      ...studentFilters
    },
    dependencies: [],
    // Remove dependencies to prevent auto-reloading
    pagination: {
      defaultLimit: 50,
      availableLimits: [25, 50, 100]
    },
    autoLoad: true // Enable auto-loading from cache
  });
  const teachersTable = useTableData<InstituteUserData>({
    endpoint: `/institute-users/institute/${currentInstituteId}/users/TEACHER`,
    defaultParams: teacherFilters,
    dependencies: [],
    // Remove dependencies to prevent auto-reloading
    pagination: {
      defaultLimit: 50,
      availableLimits: [25, 50, 100]
    },
    autoLoad: true // Enable auto-loading from cache
  });
  const attendanceMarkersTable = useTableData<InstituteUserData>({
    endpoint: `/institute-users/institute/${currentInstituteId}/users/ATTENDANCE_MARKER`,
    defaultParams: markerFilters,
    dependencies: [],
    // Remove dependencies to prevent auto-reloading
    pagination: {
      defaultLimit: 50,
      availableLimits: [25, 50, 100]
    },
    autoLoad: true // Enable auto-loading from cache
  });
  const instituteAdminsTable = useTableData<InstituteUserData>({
    endpoint: `/institute-users/institute/${currentInstituteId}/users/INSTITUTE_ADMIN`,
    defaultParams: adminFilters,
    dependencies: [],
    // Remove dependencies to prevent auto-reloading
    pagination: {
      defaultLimit: 50,
      availableLimits: [25, 50, 100]
    },
    autoLoad: true // Enable auto-loading from cache
  });
  const inactiveUsersTable = useTableData<InstituteUserData>({
    endpoint: `/institute-users/institute/${currentInstituteId}/users/inactive`,
    defaultParams: inactiveFilters,
    dependencies: [],
    // Remove dependencies to prevent auto-reloading
    pagination: {
      defaultLimit: 50,
      availableLimits: [25, 50, 100]
    },
    autoLoad: true // Enable auto-loading from cache
  });

  // Pending users table - fetches unverified users by type
  const pendingUsersTable = useTableData<InstituteUserData>({
    endpoint: `/institute-users/institute/${currentInstituteId}/users/${pendingUserType}/unverified`,
    defaultParams: pendingFilters,
    dependencies: [pendingUserType],
    // Reload when pending user type changes
    pagination: {
      defaultLimit: 50,
      availableLimits: [25, 50, 100]
    },
    autoLoad: true
  });

  // Use API request hook for creating users with duplicate prevention
  const createUserRequest = useApiRequest(async (userData: any) => {
    console.log('Creating user with data:', userData);
    // This would need to be implemented based on your API structure
    const response = await fetch(`/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    });
    return response.json();
  }, {
    preventDuplicates: true,
    showLoading: false
  });
  const handleViewUser = (user: InstituteUserData) => {
    setSelectedUser(user);
    setShowUserDialog(true);
  };
  const handleViewBasicUser = async (id?: string | null) => {
    if (!id) return;
    try {
      const info = await usersApi.getBasicInfo(id);
      setUserInfoDialog({
        open: true,
        user: info
      });
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
    return centerCrop(makeAspectCrop({
      unit: '%',
      width: 70
    }, aspect, mediaWidth, mediaHeight), mediaWidth, mediaHeight);
  }, []);
  const onCropImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const {
      width,
      height
    } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, PASSPORT_ASPECT_RATIO));
  }, [centerAspectCrop, PASSPORT_ASPECT_RATIO]);
  const getCroppedImg = useCallback((image: HTMLImageElement, cropData: PixelCrop): Promise<Blob> => {
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
    ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight, 0, 0, image.naturalWidth, image.naturalHeight);
    ctx.restore();
    return new Promise((resolve, reject) => {
      canvas.toBlob(blob => {
        if (!blob) {
          reject(new Error('Canvas is empty'));
          return;
        }
        resolve(blob);
      }, 'image/png');
    });
  }, []);
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
      const croppedFile = new File([croppedBlob], 'cropped-image.png', {
        type: 'image/png'
      });

      // Step 1: Upload file using signed URL and get relativePath
      console.log('Step 1: Getting signed URL and uploading file...');
      const relativePath = await uploadWithSignedUrl(croppedFile, 'institute-user-images', (message, progress) => {
        console.log(`Upload progress: ${progress}% - ${message}`);
      });
      console.log('Step 1 complete. RelativePath:', relativePath);

      // Step 2: Send relativePath as imageUrl to backend
      console.log('Step 2: Sending relativePath to backend...');
      const token = localStorage.getItem('access_token');
      const requestBody = {
        imageUrl: relativePath
      };
      console.log('Request body:', requestBody);
      const response = await fetch(`${getBaseUrl()}/institute-users/institute/${currentInstituteId}/users/${userId}/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      console.log('Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = {
            message: errorText
          };
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
      const response = await fetch(`${getBaseUrl()}/institute-users/institute/${currentInstituteId}/users/${userId}/activate`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
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
      const response = await fetch(`${getBaseUrl()}/institute-users/institute/${currentInstituteId}/users/${userId}/deactivate`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
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
    if (activeView === 'USERS') {
      switch (selectedUserType) {
        case 'STUDENT':
          return studentsTable;
        case 'TEACHER':
          return teachersTable;
        case 'ATTENDANCE_MARKER':
          return attendanceMarkersTable;
        case 'INSTITUTE_ADMIN':
          return instituteAdminsTable;
        default:
          return studentsTable;
      }
    } else if (activeView === 'PENDING') {
      return pendingUsersTable;
    } else {
      return inactiveUsersTable;
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
  const getUserTypeLabel = (type: UserType | ViewType) => {
    switch (type) {
      case 'STUDENT':
        return 'Students';
      case 'TEACHER':
        return 'Teachers';
      case 'ATTENDANCE_MARKER':
        return 'Attendance Markers';
      case 'INSTITUTE_ADMIN':
        return 'Institute Admins';
      case 'USERS':
        return 'Users';
      case 'PENDING':
        return 'Pending Users';
      case 'INACTIVE':
        return 'Inactive Users';
      default:
        return '';
    }
  };
  const getUserTypeIcon = (type: UserType | ViewType) => {
    switch (type) {
      case 'STUDENT':
        return GraduationCap;
      case 'TEACHER':
        return Users;
      case 'ATTENDANCE_MARKER':
        return UserCheck;
      case 'INSTITUTE_ADMIN':
        return Shield;
      case 'USERS':
        return Users;
      case 'PENDING':
        return Clock;
      case 'INACTIVE':
        return UserX;
      default:
        return Users;
    }
  };

  // Verify single pending user
  const handleVerifyUser = async (userId: string) => {
    if (!currentInstituteId) return;
    setVerifyingIds(prev => new Set(prev).add(userId));
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${getBaseUrl()}/institute-users/institute/${currentInstituteId}/verify-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          notes: 'Verified by admin'
        })
      });
      if (!response.ok) {
        throw new Error('Failed to verify user');
      }
      const result = await response.json();
      toast({
        title: "User Verified",
        description: result.message || "User has been verified successfully",
        duration: 1500
      });
      pendingUsersTable.actions.refresh();
      setSelectedPendingUsers(prev => prev.filter(id => id !== userId));
    } catch (error: any) {
      console.error('Error verifying user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to verify user",
        variant: "destructive",
        duration: 1500
      });
    } finally {
      setVerifyingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  // Bulk verify selected pending users
  const handleBulkVerify = async () => {
    if (!currentInstituteId || selectedPendingUsers.length === 0) return;
    setBulkVerifying(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${getBaseUrl()}/institute-users/institute/${currentInstituteId}/verify-users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userIds: selectedPendingUsers,
          notes: 'Bulk verification by admin'
        })
      });
      if (!response.ok) {
        throw new Error('Failed to bulk verify users');
      }
      const result = await response.json();
      toast({
        title: "Users Verified",
        description: result.message || `${result.verified?.length || selectedPendingUsers.length} users verified successfully`,
        duration: 1500
      });
      pendingUsersTable.actions.refresh();
      setSelectedPendingUsers([]);
    } catch (error: any) {
      console.error('Error bulk verifying users:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to bulk verify users",
        variant: "destructive",
        duration: 1500
      });
    } finally {
      setBulkVerifying(false);
    }
  };

  // Toggle selection of pending user
  const togglePendingUserSelection = (userId: string) => {
    setSelectedPendingUsers(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  // Select/deselect all pending users
  const toggleAllPendingUsers = () => {
    const currentPendingUsers = pendingUsersTable.state.data;
    if (selectedPendingUsers.length === currentPendingUsers.length) {
      setSelectedPendingUsers([]);
    } else {
      setSelectedPendingUsers(currentPendingUsers.map(u => u.id));
    }
  };
  const userRole = useInstituteRole();
  if (userRole !== 'InstituteAdmin') {
    return <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Access denied. InstituteAdmin role required.</p>
      </div>;
  }
  if (!currentInstituteId) {
    return <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Please select an institute first.</p>
      </div>;
  }
  const currentTable = getCurrentTable();
  const currentUsers = getCurrentUsers();
  const currentLoading = currentTable.state.loading;
  const IconComponent = activeView === 'USERS' ? getUserTypeIcon(selectedUserType) : getUserTypeIcon(activeView);
  return <div className="container mx-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Institute Users</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage users in your institute
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setShowAssignMethodsDialog(true)} variant="outline" className="flex items-center gap-2 flex-1 sm:flex-none" size="sm">
            <UserPlus className="h-4 w-4" />
            Assign User
          </Button>
          <Button onClick={() => setShowCreateComprehensiveUserDialog(true)} className="flex items-center gap-2 flex-1 sm:flex-none" size="sm">
            <Plus className="h-4 w-4" />
            Create User
          </Button>
        </div>
      </div>

      {/* Filters Component */}
      <InstituteUsersFilters filters={getCurrentFilters()} onFiltersChange={handleFiltersChange} onApplyFilters={handleApplyFilters} onClearFilters={handleClearFilters} userType={activeView === 'USERS' ? selectedUserType : activeView} isApplying={isApplyingFilters} />

      {/* Tabs for Views: Users, Pending, Inactive */}
      <Tabs value={activeView} onValueChange={value => setActiveView(value as ViewType)}>
        {/* Mobile: Horizontal scrollable tabs - Always show names */}
        <div className="lg:hidden overflow-x-auto">
          <TabsList className="inline-flex h-auto w-full gap-1 p-1 bg-muted/50 border rounded-lg">
            <TabsTrigger value="USERS" className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md whitespace-nowrap text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Users</span>
            </TabsTrigger>
            <TabsTrigger value="PENDING" className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md whitespace-nowrap text-xs sm:text-sm">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Pending</span>
            </TabsTrigger>
            <TabsTrigger value="INACTIVE" className="flex-1 flex items-center justify-center gap-1.5 px-2 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md whitespace-nowrap text-xs sm:text-sm">
              <UserX className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Inactive</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Desktop: Full width tabs with text */}
        <div className="hidden lg:block">
          <TabsList className="grid w-full grid-cols-3 gap-2 p-2 h-auto bg-muted/50">
            <TabsTrigger value="USERS" className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Users className="h-4 w-4" />
              <span>Users</span>
            </TabsTrigger>
            <TabsTrigger value="PENDING" className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Clock className="h-4 w-4" />
              <span>Pending</span>
            </TabsTrigger>
            <TabsTrigger value="INACTIVE" className="flex items-center gap-2 px-4 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <UserX className="h-4 w-4" />
              <span>Inactive</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="USERS" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* User Type Dropdown */}
              <Select value={selectedUserType} onValueChange={(value: UserType) => setSelectedUserType(value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select user type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STUDENT">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      <span>Students</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="TEACHER">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>Teachers</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="ATTENDANCE_MARKER">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-4 w-4" />
                      <span>Attendance Markers</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="INSTITUTE_ADMIN">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span>Admins</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline" className="flex items-center gap-1">
                {React.createElement(getUserTypeIcon(selectedUserType), { className: "h-4 w-4" })}
                {currentTable.pagination.totalCount} {getUserTypeLabel(selectedUserType)}
              </Badge>
            </div>
            <Button onClick={() => currentTable.actions.refresh()} disabled={currentTable.state.loading} variant="outline" size="sm">
              {currentTable.state.loading ? <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </> : <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Load {getUserTypeLabel(selectedUserType)}
                </>}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="PENDING" className="space-y-4">
          <div className="flex flex-col gap-4">
            {/* Pending user type selector */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                  <Clock className="h-4 w-4 text-amber-600" />
                  {pendingUsersTable.pagination.totalCount} Pending {pendingUserType.replace('_', ' ')}s
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={pendingUserType} onValueChange={(value: 'STUDENT' | 'TEACHER' | 'INSTITUTE_ADMIN' | 'ATTENDANCE_MARKER') => {
                setPendingUserType(value);
                setSelectedPendingUsers([]);
              }}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select user type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STUDENT">Students</SelectItem>
                    <SelectItem value="TEACHER">Teachers</SelectItem>
                    <SelectItem value="INSTITUTE_ADMIN">Admins</SelectItem>
                    <SelectItem value="ATTENDANCE_MARKER">Markers</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => pendingUsersTable.actions.refresh()} disabled={pendingUsersTable.state.loading} variant="outline" size="sm">
                  {pendingUsersTable.state.loading ? <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </> : <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </>}
                </Button>
              </div>
            </div>
            
            {/* Bulk actions */}
            {selectedPendingUsers.length > 0 && <div className="flex items-center gap-3 p-3 bg-muted rounded-lg border">
                <span className="text-sm font-medium">
                  {selectedPendingUsers.length} selected
                </span>
                <Button onClick={handleBulkVerify} disabled={bulkVerifying} size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {bulkVerifying ? <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </> : <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Verify Selected
                    </>}
                </Button>
                <Button onClick={() => setSelectedPendingUsers([])} variant="outline" size="sm">
                  Clear Selection
                </Button>
              </div>}
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
            <Button onClick={() => inactiveUsersTable.actions.refresh()} disabled={inactiveUsersTable.state.loading} variant="outline" size="sm">
              {inactiveUsersTable.state.loading ? <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </> : <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Load Inactive Users
                </>}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* Users MUI Table */}
      <Paper sx={{
      width: '100%',
      overflow: 'hidden'
    }}>
        <TableContainer sx={{
        height: 'calc(100vh - 280px)'
      }}>
          <Table stickyHeader aria-label="users table">
            <TableHead>
              <TableRow>
                {activeView === 'PENDING' && <TableCell padding="checkbox">
                    <input type="checkbox" checked={selectedPendingUsers.length === currentUsers.length && currentUsers.length > 0} onChange={toggleAllPendingUsers} className="w-4 h-4 rounded border-border" />
                  </TableCell>}
                <TableCell>Image</TableCell>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phone Number</TableCell>
                <TableCell>Institute User ID</TableCell>
                {activeView !== 'PENDING' && <TableCell>Org</TableCell>}
                {activeView !== 'PENDING' && <TableCell>Upload</TableCell>}
                {activeView === 'USERS' && selectedUserType === 'STUDENT' && <TableCell>Parent</TableCell>}
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentUsers.map(userData => <TableRow hover role="checkbox" tabIndex={-1} key={userData.id}>
                  {activeView === 'PENDING' && <TableCell padding="checkbox">
                      <input type="checkbox" checked={selectedPendingUsers.includes(userData.id)} onChange={() => togglePendingUserSelection(userData.id)} className="w-4 h-4 rounded border-border" />
                    </TableCell>}
                  <TableCell>
                    <div className="cursor-pointer flex justify-center" onClick={() => {
                  if (userData.imageUrl) {
                    setImagePreview({
                      isOpen: true,
                      url: userData.imageUrl,
                      title: userData.name
                    });
                  }
                }}>
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
                  {activeView !== 'PENDING' && <TableCell>
                      <Button size="sm" variant="outline" onClick={() => {
                  setSelectedUserForOrg({
                    id: userData.id,
                    name: userData.name
                  });
                  setOrgDialogOpen(true);
                }}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>}
                  {activeView !== 'PENDING' && <TableCell>
                      {userData.instituteUserImageUrl ? <Badge variant="default" className="bg-primary hover:bg-primary text-primary-foreground">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Uploaded
                        </Badge> : <Button size="sm" variant="outline" onClick={() => setUploadingUserId(userData.id)}>
                          <Upload className="h-4 w-4 mr-1" />
                          Upload
                        </Button>}
                    </TableCell>}
                  {activeView === 'USERS' && selectedUserType === 'STUDENT' && <TableCell>
                      <Button size="sm" variant="outline" onClick={() => handleAssignParent(userData)}>
                        <UserCog className="h-4 w-4 mr-1" />
                        Assign Parent
                      </Button>
                    </TableCell>}
                  <TableCell>
                    <div className="flex gap-2">
                      {activeView === 'USERS' && selectedUserType === 'STUDENT' ? <Button size="sm" variant="default" onClick={() => setStudentDetailsDialog({
                    open: true,
                    student: userData
                  })}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button> : <Button size="sm" variant="default" onClick={() => handleViewUser(userData)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>}
                      {activeView === 'PENDING' ? <Button size="sm" onClick={() => handleVerifyUser(userData.id)} disabled={verifyingIds.has(userData.id)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                          {verifyingIds.has(userData.id) ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                          {verifyingIds.has(userData.id) ? 'Verifying...' : 'Verify'}
                        </Button> : activeView === 'INACTIVE' ? <Button size="sm" variant="default" onClick={() => handleActivateUser(userData.id)} disabled={activatingUserId === userData.id} className="bg-primary hover:bg-primary/90">
                          {activatingUserId === userData.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserCheck className="h-4 w-4 mr-1" />}
                          {activatingUserId === userData.id ? 'Activating...' : 'Activate'}
                        </Button> : <Button size="sm" variant="destructive" onClick={() => handleDeactivateUser(userData.id)} disabled={deactivatingUserId === userData.id}>
                          {deactivatingUserId === userData.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <UserMinus className="h-4 w-4 mr-1" />}
                          {deactivatingUserId === userData.id ? 'Deactivating...' : 'Deactivate'}
                        </Button>}
                    </div>
                  </TableCell>
                </TableRow>)}
              {currentUsers.length === 0 && <TableRow>
                  <TableCell colSpan={activeView === 'USERS' && selectedUserType === 'STUDENT' ? 10 : activeView === 'INACTIVE' ? 9 : 9} align="center">
                    <div className="py-12 text-center text-muted-foreground">
                      <IconComponent className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg">No {activeView === 'USERS' ? getUserTypeLabel(selectedUserType).toLowerCase() : getUserTypeLabel(activeView).toLowerCase()}</p>
                      <p className="text-sm">No users found for the current selection</p>
                    </div>
                  </TableCell>
                </TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination rowsPerPageOptions={currentTable.availableLimits} component="div" count={currentTable.pagination.totalCount} rowsPerPage={currentTable.pagination.limit} page={currentTable.pagination.page} onPageChange={(event: unknown, newPage: number) => currentTable.actions.setPage(newPage)} onRowsPerPageChange={(event: React.ChangeEvent<HTMLInputElement>) => {
        currentTable.actions.setLimit(parseInt(event.target.value, 10));
        currentTable.actions.setPage(0);
      }} />
      </Paper>

      {/* Pagination */}
      {currentTable.pagination.totalPages > 1 && <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {currentTable.pagination.page * currentTable.pagination.limit + 1} to {Math.min((currentTable.pagination.page + 1) * currentTable.pagination.limit, currentTable.pagination.totalCount)} of {currentTable.pagination.totalCount} {activeView === 'USERS' ? selectedUserType.toLowerCase() : activeView.toLowerCase()}s
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => currentTable.actions.prevPage()} disabled={currentTable.pagination.page === 0 || currentTable.state.loading}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentTable.pagination.page + 1} of {currentTable.pagination.totalPages}
            </span>
            <Button variant="outline" size="sm" onClick={() => currentTable.actions.nextPage()} disabled={currentTable.pagination.page === currentTable.pagination.totalPages - 1 || currentTable.state.loading}>
              Next
            </Button>
          </div>
        </div>}

      {currentUsers.length === 0 && !currentLoading && <Card>
          <CardContent className="text-center py-12">
            <IconComponent className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">
              No {activeView === 'USERS' ? getUserTypeLabel(selectedUserType) : getUserTypeLabel(activeView)} Found
            </h3>
            <p className="text-muted-foreground">
              No {activeView === 'USERS' ? selectedUserType.toLowerCase().replace('_', ' ') : activeView.toLowerCase().replace('_', ' ')}s found in this institute. Click the button above to load data.
            </p>
          </CardContent>
        </Card>}

      {/* User Details Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeView === 'USERS' ? getUserTypeLabel(selectedUserType).slice(0, -1) : getUserTypeLabel(activeView).slice(0, -1)} Details</DialogTitle>
          </DialogHeader>
          {selectedUser && <div className="space-y-6">
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
                  <p className="text-muted-foreground">{selectedUser.email || 'N/A'}</p>
                  <Badge variant="outline">{activeView === 'USERS' ? selectedUserType.replace('_', ' ') : activeView.replace('_', ' ')}</Badge>
                </div>
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">User ID</label>
                  <p className="text-sm">{selectedUser.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                  <p className="text-sm">{selectedUser.phoneNumber || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                  <p className="text-sm">{selectedUser.dateOfBirth ? new Date(selectedUser.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Institute User ID</label>
                  <p className="text-sm">{selectedUser.userIdByInstitute || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Verified By</label>
                  <p className="text-sm">{selectedUser.verifiedBy || 'N/A'}</p>
                </div>
              </div>

              {/* Address Information */}
              <div>
                <h4 className="text-lg font-medium mb-3">Address Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Address Line 1</label>
                    <p className="text-sm">{selectedUser.addressLine1 || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Address Line 2</label>
                    <p className="text-sm">{selectedUser.addressLine2 || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Family Information (Students only) */}
              {activeView === 'USERS' && selectedUserType === 'STUDENT' && (selectedUser.fatherId || selectedUser.motherId || selectedUser.guardianId) && <div>
                  <h4 className="text-lg font-medium mb-3">Family Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedUser.fatherId && <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center justify-between">
                          <span>Father ID</span>
                          <Button type="button" variant="outline" size="icon" className="h-8 w-8 ml-2" onClick={() => handleViewBasicUser(selectedUser.fatherId)} aria-label="View father user details">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </label>
                        <p className="text-sm mt-1">{selectedUser.fatherId}</p>
                      </div>}
                    {selectedUser.motherId && <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center justify-between">
                          <span>Mother ID</span>
                          <Button type="button" variant="outline" size="icon" className="h-8 w-8 ml-2" onClick={() => handleViewBasicUser(selectedUser.motherId)} aria-label="View mother user details">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </label>
                        <p className="text-sm mt-1">{selectedUser.motherId}</p>
                      </div>}
                    {selectedUser.guardianId && <div>
                        <label className="text-sm font-medium text-gray-500 flex items-center justify-between">
                          <span>Guardian ID</span>
                          <Button type="button" variant="outline" size="icon" className="h-8 w-8 ml-2" onClick={() => handleViewBasicUser(selectedUser.guardianId)} aria-label="View guardian user details">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </label>
                        <p className="text-sm mt-1">{selectedUser.guardianId}</p>
                      </div>}
                  </div>
                </div>}
            </div>}
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={showCreateUserDialog} onOpenChange={setShowCreateUserDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
          </DialogHeader>
          <CreateUserForm onSubmit={handleCreateUser} onCancel={() => setShowCreateUserDialog(false)} />
        </DialogContent>
      </Dialog>

      {/* Assign User Dialog */}
      <Dialog open={showAssignUserDialog} onOpenChange={setShowAssignUserDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign User to Institute</DialogTitle>
          </DialogHeader>
          <AssignUserForm instituteId={currentInstituteId!} onSubmit={handleAssignUser} onCancel={() => setShowAssignUserDialog(false)} initialUserId={assignInitialUserId} />
        </DialogContent>
      </Dialog>

      {/* Assign Parent Dialog */}
      <Dialog open={showAssignParentDialog} onOpenChange={setShowAssignParentDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Parent to Student</DialogTitle>
          </DialogHeader>
          {selectedStudentForParent && <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Assigning parent to:</p>
              <p className="font-medium">{selectedStudentForParent.name}</p>
              <p className="text-sm text-muted-foreground">ID: {selectedStudentForParent.id}</p>
            </div>}
          <AssignParentByPhoneForm studentId={selectedStudentForParent?.id || ''} onSubmit={handleParentAssignment} onCancel={() => {
          setShowAssignParentDialog(false);
          setSelectedStudentForParent(null);
        }} />
        </DialogContent>
      </Dialog>

      {/* Assign User Methods Dialog */}
      <AssignUserMethodsDialog open={showAssignMethodsDialog} onClose={() => setShowAssignMethodsDialog(false)} instituteId={currentInstituteId} onSuccess={() => {
      // Refresh the current tab data
      getCurrentTable().actions.refresh();
    }} />

      <UserInfoDialog open={userInfoDialog.open} onClose={() => setUserInfoDialog({
      open: false,
      user: null
    })} user={userInfoDialog.user} />

      {/* User Organizations Dialog */}
      {selectedUserForOrg && <UserOrganizationsDialog open={orgDialogOpen} onOpenChange={setOrgDialogOpen} userId={selectedUserForOrg.id} userName={selectedUserForOrg.name} />}

      {/* Create Comprehensive User Dialog */}
      {showCreateComprehensiveUserDialog && <CreateComprehensiveUserForm onSubmit={data => {
      console.log('Comprehensive user created:', data);
      setShowCreateComprehensiveUserDialog(false);
      toast({
        title: "Success",
        description: data.message || "User created successfully!",
        duration: 1500
      });
      // Refresh the current tab data
      getCurrentTable().actions.refresh();
    }} onCancel={() => setShowCreateComprehensiveUserDialog(false)} />}

      {/* Upload Image Dialog with Crop */}
      <Dialog open={!!uploadingUserId} onOpenChange={handleCloseUploadDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload User Image (35mm × 45mm)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Select Image</label>
              <Input type="file" accept="image/*" onChange={handleFileSelect} />
            </div>
            
            {cropImgSrc && <div className="max-h-80 overflow-auto rounded-lg flex justify-center">
                <ReactCrop crop={crop} onChange={(_, percentCrop) => setCrop(percentCrop)} onComplete={c => setCompletedCrop(c)} aspect={PASSPORT_ASPECT_RATIO} minWidth={50} minHeight={50} keepSelection ruleOfThirds style={{
              maxHeight: '300px'
            }}>
                  <img ref={imgRef} alt="Crop preview" src={cropImgSrc} onLoad={onCropImageLoad} style={{
                maxHeight: '300px',
                maxWidth: '100%'
              }} />
                </ReactCrop>
              </div>}
            
            <p className="text-xs text-muted-foreground text-center">
              Passport photo size: 35mm × 45mm (7:9 aspect ratio)
            </p>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseUploadDialog}>
              Cancel
            </Button>
            <Button onClick={() => uploadingUserId && handleImageUpload(uploadingUserId)} disabled={!completedCrop || uploading}>
              {uploading ? <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </> : <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImagePreviewModal isOpen={imagePreview.isOpen} onClose={() => setImagePreview({
      isOpen: false,
      url: '',
      title: ''
    })} imageUrl={imagePreview.url} title={imagePreview.title} />

      {/* Student Details Dialog */}
      <StudentDetailsDialog open={studentDetailsDialog.open} onOpenChange={open => setStudentDetailsDialog({
      open,
      student: null
    })} student={studentDetailsDialog.student} />
    </div>;
};
export default InstituteUsers;