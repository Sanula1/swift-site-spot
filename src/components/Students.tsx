
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, RefreshCw, Users, Search, Filter, UserPlus, ChevronRight, User, Eye, Phone, MapPin, Briefcase, Mail, Home } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { DataCardView } from '@/components/ui/data-card-view';
import MUITable from '@/components/ui/mui-table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AssignStudentsDialog from '@/components/forms/AssignStudentsDialog';
import AssignSubjectStudentsDialog from '@/components/forms/AssignSubjectStudentsDialog';
import { cachedApiClient } from '@/api/cachedClient';
import { useApiRequest } from '@/hooks/useApiRequest';
import { useTableData } from '@/hooks/useTableData';
import { getBaseUrl } from '@/contexts/utils/auth.api';
import { getImageUrl } from '@/utils/imageUrlHelper';
import ImagePreviewModal from '@/components/ImagePreviewModal';
import { enhancedCachedClient } from '@/api/enhancedCachedClient';
import { CACHE_TTL } from '@/config/cacheTTL';
import StudentDetailsDialog from '@/components/forms/StudentDetailsDialog';

interface InstituteStudent {
  id: string;
  name: string;
  email?: string;
  addressLine1?: string;
  addressLine2?: string;
  phoneNumber?: string;
  imageUrl?: string;
  dateOfBirth?: string;
  userIdByInstitute?: string | null;
  fatherId?: string | null;
  motherId?: string | null;
  guardianId?: string | null;
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

interface InstituteStudentsResponse {
  data: InstituteStudent[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface Student {
  userId: string;
  fatherId: string | null;
  motherId: string | null;
  guardianId: string | null;
  studentId: string;
  emergencyContact: string;
  medicalConditions?: string;
  allergies?: string;
  bloodGroup?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    userType: string;
    dateOfBirth: string;
    gender: string;
    imageUrl?: string;
    isActive: boolean;
    subscriptionPlan: string;
    createdAt: string;
  };
}

interface StudentsResponse {
  data: Student[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
    previousPage: number | null;
    nextPage: number | null;
  };
}

const Students = () => {
  const { toast } = useToast();
  const { user, selectedInstitute, selectedClass, selectedSubject } = useAuth();
  const userRole = useInstituteRole();
  
  // State for both types of student data
  const [students, setStudents] = useState<Student[]>([]);
  const [instituteStudents, setInstituteStudents] = useState<InstituteStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showSubjectAssignDialog, setShowSubjectAssignDialog] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  
  // Use ref to track if we're currently fetching to prevent duplicate calls
  const isFetchingRef = useRef(false);
  
  // Track current context to prevent unnecessary reloads
  // Build contextKey based on selection level to match cache context
  const contextKey = useMemo(() => {
    if (selectedSubject?.id && selectedClass?.id && selectedInstitute?.id) {
      // Subject level: institute + class + subject
      return `subject-${selectedInstitute.id}-${selectedClass.id}-${selectedSubject.id}`;
    } else if (selectedClass?.id && selectedInstitute?.id) {
      // Class level: institute + class only
      return `class-${selectedInstitute.id}-${selectedClass.id}`;
    } else if (selectedInstitute?.id) {
      // Institute level: institute only
      return `institute-${selectedInstitute.id}`;
    }
    return 'global'; // Global students (non-institute users)
  }, [selectedInstitute?.id, selectedClass?.id, selectedSubject?.id]);
  
  const [lastLoadedContext, setLastLoadedContext] = useState<string>('');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [includeParentInfo, setIncludeParentInfo] = useState(true);
  const [parentDetailsDialog, setParentDetailsDialog] = useState<{ open: boolean; parent: any }>({
    open: false,
    parent: null
  });
  const [imagePreview, setImagePreview] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: ''
  });
  const [studentDetailsDialog, setStudentDetailsDialog] = useState<{ open: boolean; student: InstituteStudent | null }>({
    open: false,
    student: null
  });

  // Enhanced pagination with useTableData hook - DISABLE AUTO-LOADING
  const {
    state: { data: paginatedStudents, loading: tableLoading },
    pagination,
    actions,
    filters
  } = useTableData<Student>({
    endpoint: '/students',
    defaultParams: {},
    dependencies: [],
    pagination: {
      defaultLimit: 50,
      availableLimits: [25, 50, 100]
    },
    autoLoad: false // Disable auto-loading - only load on explicit refresh
  });

  // Check if user should use new institute-based API (memoized to prevent re-renders)
  const shouldUseInstituteApi = useMemo(() => {
    return ['InstituteAdmin', 'Teacher'].includes(userRole) && !!selectedInstitute;
  }, [userRole, selectedInstitute]);

  const getApiHeaders = () => {
    const token = localStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  // Use API request hook for fetching students (original API)
  const fetchStudentsRequest = useApiRequest(
    async (page: number) => {
      console.log(`Fetching students with params: page=${page}&limit=${pagination.limit}`);
      const response = await cachedApiClient.get<StudentsResponse>(
        '/students',
        { page: page.toString(), limit: pagination.limit.toString() },
        { ttl: 15, useStaleWhileRevalidate: true }
      );
      return response;
    },
    { preventDuplicates: true }
  );

  // Original fetch function for Student users
  const fetchStudents = async (page = 1) => {
    try {
      const data = await fetchStudentsRequest.execute(page);
      console.log('Students data received:', data);
      
      setStudents(data.data);
      // Note: pagination is managed by the hook automatically
      setDataLoaded(true);
      
      toast({
        title: "Students Loaded",
        description: `Successfully loaded ${data.data.length} students.`
      });
    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: "Error",
        description: "Failed to load students",
        variant: "destructive"
      });
    }
  };

  // New fetch function for institute-based students (class only)
  const fetchInstituteClassStudents = async (forceRefresh = false) => {
    if (!selectedInstitute?.id || !selectedClass?.id) return;

    console.log('[Students] Fetching CLASS students:', {
      forceRefresh,
      instituteId: selectedInstitute.id,
      classId: selectedClass.id,
      contextKey
    });

    // Only show loading spinner when force refreshing (user clicked button)
    if (forceRefresh) {
      setLoading(true);
    }
    
    try {
      const queryParams: Record<string, string> = {
        parent: String(includeParentInfo)
      };
      
      const data: InstituteStudentsResponse = await enhancedCachedClient.get(
        `/institute-users/institute/${selectedInstitute.id}/users/STUDENT/class/${selectedClass.id}`,
        queryParams,
        {
          ttl: CACHE_TTL.STUDENTS,
          forceRefresh,
          userId: user?.id,
          role: userRole,
          instituteId: selectedInstitute.id,
          classId: selectedClass.id
        }
      );
      
      setInstituteStudents(data.data);
      const totalStudents = data.meta.total;
      const currentPage = data.meta.page;
      const totalPages = data.meta.totalPages;
      setDataLoaded(true);
      
      // Only show toast when force refreshing
      if (forceRefresh) {
        toast({
          title: "Class Students Loaded",
          description: `Successfully loaded ${data.data.length} students.`
        });
      }
    } catch (error) {
      console.error('Error fetching class students:', error);
      toast({
        title: "Error",
        description: "Failed to load class students",
        variant: "destructive"
      });
    } finally {
      if (forceRefresh) {
        setLoading(false);
      }
    }
  };

  // New fetch function for institute-based students (class + subject)
  const fetchInstituteSubjectStudents = async (forceRefresh = false) => {
    if (!selectedInstitute?.id || !selectedClass?.id || !selectedSubject?.id) return;

    console.log('[Students] Fetching SUBJECT students:', {
      forceRefresh,
      instituteId: selectedInstitute.id,
      classId: selectedClass.id,
      subjectId: selectedSubject.id,
      contextKey
    });

    // Only show loading spinner when force refreshing (user clicked button)
    if (forceRefresh) {
      setLoading(true);
    }
    
    try {
      const queryParams: Record<string, string> = {
        parent: String(includeParentInfo)
      };
      
      const data: InstituteStudentsResponse = await enhancedCachedClient.get(
        `/institute-users/institute/${selectedInstitute.id}/users/STUDENT/class/${selectedClass.id}/subject/${selectedSubject.id}`,
        queryParams,
        {
          ttl: CACHE_TTL.STUDENTS,
          forceRefresh,
          userId: user?.id,
          role: userRole,
          instituteId: selectedInstitute.id,
          classId: selectedClass.id,
          subjectId: selectedSubject.id
        }
      );
      
      setInstituteStudents(data.data);
      const totalStudents = data.meta.total;
      const currentPage = data.meta.page;
      const totalPages = data.meta.totalPages;
      setDataLoaded(true);
      
      // Only show toast when force refreshing
      if (forceRefresh) {
        toast({
          title: "Subject Students Loaded",
          description: `Successfully loaded ${data.data.length} students.`
        });
      }
    } catch (error) {
      console.error('Error fetching subject students:', error);
      toast({
        title: "Error",
        description: "Failed to load subject students",
        variant: "destructive"
      });
    } finally {
      if (forceRefresh) {
        setLoading(false);
      }
    }
  };

  // Auto-load data when context changes (uses cache if available)
  useEffect(() => {
    console.log('[Students] useEffect triggered:', {
      shouldUseInstituteApi,
      contextKey,
      lastLoadedContext,
      needsLoad: contextKey !== lastLoadedContext,
      isFetching: isFetchingRef.current,
      selectedInstitute: selectedInstitute?.id,
      selectedClass: selectedClass?.id,
      selectedSubject: selectedSubject?.id
    });

    // Prevent duplicate calls if already fetching or context hasn't changed
    if (isFetchingRef.current || !shouldUseInstituteApi || contextKey === lastLoadedContext) {
      return;
    }

    setLastLoadedContext(contextKey);
    isFetchingRef.current = true;
    
    const loadData = async () => {
      try {
        if (selectedSubject && selectedClass && selectedInstitute) {
          // Load subject students automatically from cache (no loading indicator)
          console.log('[Students] Auto-loading SUBJECT students from cache...');
          await fetchInstituteSubjectStudents(false);
        } else if (selectedClass && selectedInstitute) {
          // Load class students automatically from cache (no loading indicator)
          console.log('[Students] Auto-loading CLASS students from cache...');
          await fetchInstituteClassStudents(false);
        }
      } finally {
        isFetchingRef.current = false;
      }
    };
    
    loadData();
  }, [contextKey, shouldUseInstituteApi]);

  // Refetch when parent filter changes
  useEffect(() => {
    if (!shouldUseInstituteApi || !selectedClass || !dataLoaded) return;
    
    // Trigger refresh with the new filter
    if (selectedSubject) {
      fetchInstituteSubjectStudents(true);
    } else {
      fetchInstituteClassStudents(true);
    }
  }, [includeParentInfo]);

  // Determine which fetch function to use (for refresh button - forces backend call)
  const getLoadFunction = () => {
    if (!shouldUseInstituteApi) {
      // Use the table data loading function for global students
      return () => actions.loadData(true); // Force refresh
    }
    
    if (selectedSubject) {
      return () => fetchInstituteSubjectStudents(true); // Force refresh
    } else if (selectedClass) {
      return () => fetchInstituteClassStudents(true); // Force refresh
    }
    
    // Fallback to table data loading
    return () => actions.loadData(true);
  };

  const getLoadButtonText = () => {
    if (!shouldUseInstituteApi) {
      return tableLoading || loading ? 'Loading Students...' : 'Load Students';
    }
    
    if (selectedSubject) {
      return loading ? 'Loading Subject Students...' : 'Load Subject Students';
    } else if (selectedClass) {
      return loading ? 'Loading Class Students...' : 'Load Class Students';
    }
    
    return tableLoading || loading ? 'Loading Students...' : 'Load Students';
  };

  const getCurrentSelection = () => {
    if (!shouldUseInstituteApi) return '';
    
    const parts = [];
    if (selectedInstitute) parts.push(`Institute: ${selectedInstitute.name}`);
    if (selectedClass) parts.push(`Class: ${selectedClass.name}`);
    if (selectedSubject) parts.push(`Subject: ${selectedSubject.name}`);
    return parts.join(' → ');
  };

  // Columns for both student types
  const studentColumns = [
    {
      key: 'student',
      header: 'Student',
      render: (value: any, row: Student | InstituteStudent) => {
        // Handle different data structures
        const name = 'user' in row ? `${row.user.firstName} ${row.user.lastName}` : row.name;
        const email = 'user' in row ? row.user.email : (row as InstituteStudent).email || 'N/A';
        const imageUrl = 'user' in row ? row.user.imageUrl : (row as InstituteStudent).imageUrl;
        const userIdByInstitute = 'user' in row ? 'N/A' : (row as InstituteStudent).userIdByInstitute || row.id;
        
        return (
          <div className="flex items-center space-x-3">
            <div 
              className="cursor-pointer flex-shrink-0"
              onClick={() => {
                if (imageUrl) {
                  setImagePreview({ 
                    isOpen: true, 
                    url: imageUrl, 
                    title: name 
                  });
                }
              }}
            >
              <Avatar className="h-8 w-8 sm:h-10 sm:w-10 hover:opacity-80 transition-opacity">
                <AvatarImage src={getImageUrl(imageUrl)} alt={name} />
                <AvatarFallback className="text-xs">
                  {name.split(' ').map(n => n.charAt(0)).join('')}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{name}</p>
              <p className="text-sm text-muted-foreground truncate">ID: {userIdByInstitute}</p>
            </div>
          </div>
        );
      }
    },
    {
      key: 'contact',
      header: 'Contact Information',
      render: (value: any, row: Student | InstituteStudent) => {
        const phone = 'user' in row ? row.user.phoneNumber : (row as InstituteStudent).phoneNumber;
        const email = 'user' in row ? row.user.email : (row as InstituteStudent).email;
        
        return (
          <div className="space-y-1">
            <div className="flex items-center text-sm">
              <span className="truncate">{email || 'N/A'}</span>
            </div>
            <div className="flex items-center text-sm">
              <span className="truncate">{phone || 'N/A'}</span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'address',
      header: 'Address',
      render: (value: any, row: Student | InstituteStudent) => {
        if ('user' in row) {
          return <span className="text-sm text-muted-foreground">N/A</span>;
        }
        
        const student = row as InstituteStudent;
        return (
          <div className="space-y-1 text-sm">
            <p className="truncate">{student.addressLine1 || 'N/A'}</p>
            {student.addressLine2 && (
              <p className="text-muted-foreground truncate">{student.addressLine2}</p>
            )}
          </div>
        );
      }
    },
    {
      key: 'dateOfBirth',
      header: 'Date of Birth',
      render: (value: any, row: Student | InstituteStudent) => {
        const dateOfBirth = 'user' in row ? row.user.dateOfBirth : (row as InstituteStudent).dateOfBirth;
        
        return (
          <div className="text-sm">
            {dateOfBirth 
              ? new Date(dateOfBirth).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })
              : 'N/A'
            }
          </div>
        );
      }
    },
    {
      key: 'guardians',
      header: 'Parent/Guardian',
      render: (value: any, row: Student | InstituteStudent) => {
        const student = row as InstituteStudent;
        const hasParent = student.father || student.fatherId || student.motherId || student.guardianId;
        
        if ('user' in row) {
          // Original Student structure
          return (
            <div className="space-y-1">
              {row.fatherId && (
                <Badge variant="outline" className="text-xs">
                  Father: {row.fatherId}
                </Badge>
              )}
              {row.motherId && (
                <Badge variant="outline" className="text-xs">
                  Mother: {row.motherId}
                </Badge>
              )}
              {row.guardianId && (
                <Badge variant="outline" className="text-xs">
                  Guardian: {row.guardianId}
                </Badge>
              )}
              {!row.fatherId && !row.motherId && !row.guardianId && (
                <span className="text-sm text-muted-foreground">N/A</span>
              )}
            </div>
          );
        }
        
        // InstituteStudent structure - show badges only (no View button)
        return (
          <div className="space-y-1">
            {student.fatherId && (
              <Badge variant="outline" className="text-xs">
                Father
              </Badge>
            )}
            {student.motherId && (
              <Badge variant="outline" className="text-xs">
                Mother
              </Badge>
            )}
            {student.guardianId && (
              <Badge variant="outline" className="text-xs">
                Guardian
              </Badge>
            )}
            {!student.fatherId && !student.motherId && !student.guardianId && (
              <span className="text-sm text-muted-foreground">N/A</span>
            )}
          </div>
        );
      }
    }
  ];

  // Get the current dataset to filter and display
  const getCurrentStudentData = () => {
    if (!shouldUseInstituteApi) {
      // Use table data for global students
      return paginatedStudents;
    }
    // Use institute students for institute-based views
    return instituteStudents;
  };

  const filteredStudents = getCurrentStudentData().filter((student: Student | InstituteStudent) => {
    // Handle different data structures for search
    let name, email, studentId;
    
    if ('user' in student) {
      // Original Student structure
      name = `${student.user.firstName} ${student.user.lastName}`;
      email = student.user.email;
      studentId = student.studentId;
    } else {
      // InstituteStudent structure
      name = student.name;
      email = student.email || '';
      studentId = student.userIdByInstitute || student.id;
    }
    
    const matchesSearch = !searchTerm || 
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      studentId.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter only applies to original Student structure
    const matchesStatus = statusFilter === 'all' || 
      ('user' in student && statusFilter === 'active' && student.isActive) || 
      ('user' in student && statusFilter === 'inactive' && !student.isActive) ||
      !('user' in student); // Institute students don't have status filter
    
    return matchesSearch && matchesStatus;
  });

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Please log in to view students.</p>
      </div>
    );
  }

  // Special handling for InstituteAdmin and Teacher users requiring selections
  // Only show "please select" if no class is selected AND we don't have any data yet
  if (shouldUseInstituteApi && !selectedClass) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        {/* Current Selection Display */}
        
        <div className="flex flex-col gap-3 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Students</h1>
            {/* Breadcrumb Display */}
            {(selectedInstitute || selectedClass) && (
              <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mt-1">
                {selectedInstitute && (
                  <>
                    <span>Institute: {selectedInstitute.name}</span>
                    {selectedClass && <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />}
                  </>
                )}
                {selectedClass && (
                  <>
                    <span>Class: {selectedClass.name}</span>
                    {selectedSubject && <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />}
                  </>
                )}
                {selectedSubject && <span>Subject: {selectedSubject.name}</span>}
              </div>
            )}
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              {getCurrentSelection() || 'Select institute and class to view students'}
            </p>
          </div>
        </div>

        {!selectedClass ? (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Select Class Required
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Please select an institute and class to view students.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="h-16 w-16 mx-auto mb-4 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Load Students
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Current Selection: {getCurrentSelection()}
              </p>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Click the button below to load students for your selection.
              </p>
              <Button 
                onClick={getLoadFunction()} 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {getLoadButtonText()}
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    {getLoadButtonText()}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Current Selection Display */}
      
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Students</h1>
          {/* Breadcrumb Display */}
          {shouldUseInstituteApi && (selectedInstitute || selectedClass) && (
            <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground mt-1">
              {selectedInstitute && (
                <>
                  <span>Institute: {selectedInstitute.name}</span>
                  {selectedClass && <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />}
                </>
              )}
              {selectedClass && (
                <>
                  <span>Class: {selectedClass.name}</span>
                  {selectedSubject && <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />}
                </>
              )}
              {selectedSubject && <span>Subject: {selectedSubject.name}</span>}
            </div>
          )}
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {shouldUseInstituteApi && getCurrentSelection() 
              ? 'Manage students for your selection' 
              : 'Manage student records and information'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {pagination.totalCount} Students
          </Badge>
          {/* Assign User Buttons - Only for InstituteAdmin and Teacher */}
          {shouldUseInstituteApi && selectedClass && (userRole === 'InstituteAdmin' || userRole === 'Teacher') && (
            <>
              {selectedSubject ? (
                <Button
                  onClick={() => setShowSubjectAssignDialog(true)}
                  className="flex items-center gap-2 flex-1 sm:flex-none"
                  size="sm"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Assign User</span>
                  <span className="sm:hidden">Assign</span>
                </Button>
              ) : (
                <Button
                  onClick={() => setShowAssignDialog(true)}
                  className="flex items-center gap-2 flex-1 sm:flex-none"
                  size="sm"
                >
                  <UserPlus className="h-4 w-4" />
                  <span className="hidden sm:inline">Assign User</span>
                  <span className="sm:hidden">Assign</span>
                </Button>
              )}
            </>
          )}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 flex-1 sm:flex-none"
            size="sm"
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
          <Button 
            onClick={getLoadFunction()} 
            disabled={tableLoading || loading}
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none"
          >
            {tableLoading || loading ? (
              <>
                <RefreshCw className="h-4 w-4 sm:mr-2 animate-spin" />
                <span className="hidden sm:inline">Loading...</span>
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Refresh</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Filter Controls */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="h-5 w-5" />
              Filter Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              {!shouldUseInstituteApi && (
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {shouldUseInstituteApi && (
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="includeParentInfo" 
                    checked={includeParentInfo}
                    onCheckedChange={(checked) => setIncludeParentInfo(checked === true)}
                  />
                  <Label htmlFor="includeParentInfo" className="text-sm font-medium cursor-pointer">
                    Include Parent Info
                  </Label>
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setIncludeParentInfo(false);
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Students Table/Cards */}
      {filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Students Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || statusFilter !== 'all' 
                ? 'No students match your current filters.' 
                : 'No students have been created yet.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* MUI Table View - All Screen Sizes */}
          <MUITable
            title=""
            data={filteredStudents}
            columns={studentColumns.map(col => ({
              id: col.key,
              label: col.header,
              minWidth: 170,
              format: col.render
            }))}
            onAdd={undefined}
            onEdit={undefined}
            onDelete={undefined}
            onView={(row: InstituteStudent) => setStudentDetailsDialog({ open: true, student: row })}
            page={pagination.page}
            rowsPerPage={pagination.limit}
            totalCount={filteredStudents.length}
            onPageChange={actions.setPage}
            onRowsPerPageChange={actions.setLimit}
            sectionType="students"
            allowAdd={false}
            allowEdit={false}
            allowDelete={false}
          />
        </>
      )}

      {/* Pagination - Only show for paginated data */}
      {shouldUseInstituteApi && pagination.totalCount > pagination.limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(pagination.page * pagination.limit) + 1} to {Math.min((pagination.page + 1) * pagination.limit, pagination.totalCount)} of {pagination.totalCount} students
          </p>
        </div>
      )}

      {/* Create Student Form Dialog - Only for non-institute users */}

      {/* Assign Students Dialog - Only for InstituteAdmin and Teacher (Class level) */}
      {shouldUseInstituteApi && selectedClass && !selectedSubject && (
        <AssignStudentsDialog
          open={showAssignDialog}
          onOpenChange={setShowAssignDialog}
          onAssignmentComplete={() => {
            // Refresh the students list using the correct load function
            getLoadFunction()();
          }}
        />
      )}

      {/* Assign Subject Students Dialog - Only for InstituteAdmin and Teacher (Subject level) */}
      {shouldUseInstituteApi && selectedClass && selectedSubject && (
        <AssignSubjectStudentsDialog
          open={showSubjectAssignDialog}
          onOpenChange={setShowSubjectAssignDialog}
          onAssignmentComplete={() => {
            // Refresh the students list using the correct load function  
            getLoadFunction()();
          }}
        />
      )}

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

      {/* Parent Details Dialog */}
      <Dialog open={parentDetailsDialog.open} onOpenChange={(open) => !open && setParentDetailsDialog({ open: false, parent: null })}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {parentDetailsDialog.parent?.name || 'Parent Details'}
            </DialogTitle>
          </DialogHeader>
          
          {parentDetailsDialog.parent && (
            <div className="space-y-6">
              {/* Parent Avatar and Info */}
              <div className="flex items-center gap-4 pb-4 border-b">
                <Avatar className="h-16 w-16 border-2 border-primary/20">
                  <AvatarImage src={getImageUrl(parentDetailsDialog.parent.imageUrl)} alt={parentDetailsDialog.parent.name} className="object-cover" />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-lg">
                    {parentDetailsDialog.parent.name?.split(' ').map((n: string) => n.charAt(0)).join('') || 'P'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{parentDetailsDialog.parent.name || 'N/A'}</h3>
                  <p className="text-sm text-muted-foreground">{parentDetailsDialog.parent.email || 'N/A'}</p>
                </div>
              </div>
              
              {/* Parent Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Parent ID:</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {parentDetailsDialog.parent.id || 'N/A'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Occupation:</span>
                  <span>{parentDetailsDialog.parent.occupation || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Workplace:</span>
                  <span>{parentDetailsDialog.parent.workPlace || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Phone:</span>
                  <span>{parentDetailsDialog.parent.phoneNumber || 'N/A'}</span>
                </div>
              </div>

              {/* Children List */}
              {parentDetailsDialog.parent.children && parentDetailsDialog.parent.children.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Children ({parentDetailsDialog.parent.children.length})
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Avatar</TableHead>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Relationship</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parentDetailsDialog.parent.children.map((child: any, index: number) => (
                        <TableRow key={child.userId || index}>
                          <TableCell>
                            <Avatar className="h-12 w-12 border-2 border-primary/20">
                              <AvatarImage src={getImageUrl(child.imageUrl)} alt={child.name} className="object-cover" />
                              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/40 text-xs">
                                {child.name?.charAt(0) || 'C'}
                              </AvatarFallback>
                            </Avatar>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-xs">
                              {child.studentId || 'N/A'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{child.name || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {child.relationshipType || 'N/A'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Students;
