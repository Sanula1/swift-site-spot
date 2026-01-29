import React, { useState, useEffect } from 'react';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import MUITable from '@/components/ui/mui-table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getImageUrl } from '@/utils/imageUrlHelper';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, RefreshCw, GraduationCap, Image, Edit, Filter, Search, X, QrCode, UserPlus, UserMinus } from 'lucide-react';
import { TeacherSelectorDialog } from '@/components/dialogs/TeacherSelectorDialog';
import { instituteClassesApi } from '@/api/instituteClasses.api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { getBaseUrl, getAccessTokenAsync } from '@/contexts/utils/auth.api';
import CreateClassForm from '@/components/forms/CreateClassForm';
import UpdateClassForm from '@/components/forms/UpdateClassForm';
import { AccessControl } from '@/utils/permissions';
import { UserRole } from '@/contexts/types/auth.types';
import { useTableData } from '@/hooks/useTableData';
import { enhancedCachedClient } from '@/api/enhancedCachedClient';
import { CACHE_TTL } from '@/config/cacheTTL';
interface TeacherInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  imageUrl?: string;
  phoneNumber?: string;
  userType: string;
}
interface ClassData {
  id: string;
  instituteId: string;
  name: string;
  code: string;
  academicYear: string;
  level: number;
  grade: number;
  specialty: string;
  classType: string;
  capacity: number;
  classTeacherId: string;
  description: string;
  isActive: boolean;
  startDate: string;
  endDate: string;
  enrollmentCode: string;
  enrollmentEnabled: boolean;
  requireTeacherVerification: boolean;
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
  classTeacher?: TeacherInfo | null;
}
interface ApiResponse {
  data: ClassData[];
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
const Classes = () => {
  const {
    user,
    selectedInstitute
  } = useAuth();
  const {
    toast
  } = useToast();
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(false);
  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50); // Default 50 instead of 25
  const [totalCount, setTotalCount] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassData | null>(null);
  const [isViewCodeDialogOpen, setIsViewCodeDialogOpen] = useState(false);
  const [enrollmentCodeData, setEnrollmentCodeData] = useState<any>(null);
  const [loadingCodeId, setLoadingCodeId] = useState<string | null>(null);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState<string>('');

  // Teacher assignment state
  const [isTeacherSelectorOpen, setIsTeacherSelectorOpen] = useState(false);
  const [selectedClassForTeacher, setSelectedClassForTeacher] = useState<string>('');
  const [assigningTeacherId, setAssigningTeacherId] = useState<string | null>(null);
  const [unassigningClassId, setUnassigningClassId] = useState<string | null>(null);

  // Confirm remove teacher dialog state
  const [confirmRemoveDialog, setConfirmRemoveDialog] = useState<{ open: boolean; classId: string; teacherName: string }>({
    open: false,
    classId: '',
    teacherName: ''
  });

  // Image preview state
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Auto-load classes when institute is selected
  useEffect(() => {
    if (selectedInstitute?.id) {
      fetchClasses(false); // Auto-load from cache
    }
  }, [selectedInstitute?.id]);
  const userRole = useInstituteRole();
  const isInstituteAdmin = userRole === 'InstituteAdmin';
  const canEdit = AccessControl.hasPermission(userRole, 'edit-class') && !isInstituteAdmin;
  const canDelete = AccessControl.hasPermission(userRole, 'delete-class') && !isInstituteAdmin;
  const canCreate = userRole === 'InstituteAdmin';
  const canAdd = canCreate;
  
  const getApiHeaders = async () => {
    const token = await getAccessTokenAsync();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };
  
  const fetchClasses = async (forceRefresh = false, customLimit?: number) => {
    if (!selectedInstitute?.id) {
      toast({
        title: "Missing Information",
        description: "Please select an institute first.",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const params = {
        page: page + 1,
        // API expects 1-based pagination
        limit: customLimit ?? rowsPerPage,
        instituteId: selectedInstitute.id
      };
      const data = await enhancedCachedClient.get('/institute-classes', params, {
        ttl: CACHE_TTL.INSTITUTE_CLASSES,
        forceRefresh,
        userId: user?.id,
        role: userRole || 'User',
        instituteId: selectedInstitute.id
      });
      let classesArray = [];
      let totalCount = 0;

      // Handle different response structures
      if (Array.isArray(data)) {
        // Direct array response
        classesArray = data;
        totalCount = data.length;
      } else if (data.data && Array.isArray(data.data)) {
        // Paginated response with meta
        classesArray = data.data;
        totalCount = data.meta?.total || data.data.length;
      } else {
        // Fallback
        classesArray = [];
        totalCount = 0;
      }

      // Normalize imageUrl from various possible fields and ensure absolute URL
      const base = getBaseUrl?.() || '';
      const normalized = (classesArray as any[]).map((c: any) => {
        const raw = c.imageUrl || c.image || c.logo || c.coverImageUrl;
        const imageUrl = raw ? String(raw).startsWith('http') ? String(raw) : `${base}${String(raw).startsWith('/') ? '' : '/'}${String(raw)}` : '';
        return {
          ...c,
          imageUrl
        };
      });
      setClasses(normalized);
      setTotalCount(totalCount);
      toast({
        title: "Classes Loaded",
        description: `Successfully loaded ${normalized.length} classes.`
      });
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast({
        title: "Error",
        description: "Failed to load classes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleCreateClass = async (responseData: any) => {
    console.log('Class created successfully:', responseData);
    setIsCreateDialogOpen(false);
    // Show success toast with the message from the response
    if (responseData?.message) {
      toast({
        title: "Success",
        description: responseData.message
      });
    }
    fetchClasses(true); // Refresh data with cache bypass
  };
  const handleCancelCreate = () => {
    setIsCreateDialogOpen(false);
  };
  const handleEditClass = (classData: ClassData) => {
    setSelectedClass(classData);
    setIsUpdateDialogOpen(true);
  };
  const handleUpdateClass = async (responseData: any) => {
    console.log('Class updated successfully:', responseData);
    setIsUpdateDialogOpen(false);
    setSelectedClass(null);
    fetchClasses(true); // Refresh data with cache bypass
  };
  const handleCancelUpdate = () => {
    setIsUpdateDialogOpen(false);
    setSelectedClass(null);
  };
  const handleDeleteClass = async (classId: string) => {
    // Simulate API call
    console.log('Deleting class with ID:', classId);
    toast({
      title: "Class Deleted",
      description: `Successfully deleted class with ID: ${classId}`
    });
    fetchClasses(); // Refresh data
  };
  const handleLoadData = () => {
    fetchClasses(false); // Normal load with cache
  };
  const handleRefresh = () => {
    fetchClasses(true); // Force refresh, bypass cache
  };
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedGrade('');
    setPage(0);
  };
  const handleAssignTeacher = (classId: string) => {
    setSelectedClassForTeacher(classId);
    setIsTeacherSelectorOpen(true);
  };
  const handleUnassignTeacher = async (classId: string) => {
    if (unassigningClassId) return;
    setUnassigningClassId(classId);
    try {
      await instituteClassesApi.unassignTeacher(classId);
      toast({
        title: "Success",
        description: "Teacher unassigned successfully"
      });
      fetchClasses(true);
    } catch (error) {
      console.error('Error unassigning teacher:', error);
      toast({
        title: "Error",
        description: "Failed to unassign teacher",
        variant: "destructive"
      });
    } finally {
      setUnassigningClassId(null);
    }
  };
  const handleTeacherSelect = async (teacherId: string) => {
    if (assigningTeacherId) return;
    setAssigningTeacherId(selectedClassForTeacher);
    try {
      await instituteClassesApi.assignTeacher(selectedClassForTeacher, teacherId);
      toast({
        title: "Success",
        description: "Teacher assigned successfully"
      });
      fetchClasses(true);
    } catch (error) {
      console.error('Error assigning teacher:', error);
      toast({
        title: "Error",
        description: "Failed to assign teacher",
        variant: "destructive"
      });
      throw error;
    } finally {
      setAssigningTeacherId(null);
    }
  };
  const handleViewCode = async (classId: string) => {
    setLoadingCodeId(classId);
    try {
      const data = await enhancedCachedClient.get(`/institute-classes/${classId}/enrollment-code`, {}, {
        ttl: CACHE_TTL.ENROLLMENT_STATUS,
        forceRefresh: false,
        userId: user?.id,
        role: userRole || 'User',
        instituteId: selectedInstitute?.id
      });
      setEnrollmentCodeData(data);
      setIsViewCodeDialogOpen(true);
    } catch (error: any) {
      console.error('Error fetching enrollment code:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to load enrollment code",
        variant: "destructive"
      });
    } finally {
      setLoadingCodeId(null);
    }
  };

  // Frontend filtering
  const filteredClasses = classes.filter(classItem => {
    const matchesSearch = !searchTerm.trim() || classItem.name.toLowerCase().includes(searchTerm.toLowerCase()) || classItem.code.toLowerCase().includes(searchTerm.toLowerCase()) || classItem.specialty.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = !selectedGrade || classItem.grade.toString() === selectedGrade;
    return matchesSearch && matchesGrade;
  });

  // Apply pagination to filtered results
  const paginatedClasses = filteredClasses.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const columns = [
    {
      key: 'id',
      header: 'Class ID',
      render: (value: string) => (
        <span className="inline-flex items-center rounded-md border border-border bg-muted px-2 py-1 font-mono text-sm sm:text-base font-semibold text-foreground">
          {value}
        </span>
      )
    },
    {
      key: 'imageUrl',
      header: 'Image',
      render: (value: string, row: any) => (
        <Avatar 
          className="h-12 w-12 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
          onClick={() => value && setPreviewImage({ url: getImageUrl(value), title: `${row.name} - Class Image` })}
        >
          <AvatarImage src={getImageUrl(value)} alt={`${row.name} class image`} className="object-cover" />
          <AvatarFallback className="bg-muted text-muted-foreground">
            <Image className="h-6 w-6" />
          </AvatarFallback>
        </Avatar>
      )
    },
    {
      key: 'name',
      header: 'Class Name',
      render: (value: string) => (
        <div className="min-w-0">
          <div className="font-medium truncate">{value}</div>
        </div>
      )
    },
    {
      key: 'classTeacher',
      header: 'Class Teacher',
      render: (_value: any, row: ClassData) => {
        const t = row.classTeacher;
        if (!t) return <span className="text-sm text-muted-foreground">Not assigned</span>;

        const fullName = `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Teacher';
        const initials = fullName
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((p) => p[0]?.toUpperCase())
          .join('');

        return (
          <div className="flex items-center gap-3 min-w-0">
            <Avatar 
              className="h-9 w-9 cursor-pointer hover:ring-2 hover:ring-primary transition-all"
              onClick={() => t.imageUrl && setPreviewImage({ url: getImageUrl(t.imageUrl), title: `${fullName} - Teacher` })}
            >
              <AvatarImage
                src={getImageUrl(t.imageUrl)}
                alt={`${fullName} teacher profile image`}
                className="object-cover"
              />
              <AvatarFallback className="bg-muted text-muted-foreground text-xs font-medium">
                {initials || 'T'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="font-medium truncate">{fullName}</div>
              <div className="text-xs text-muted-foreground truncate">{t.email}</div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'grade',
      header: 'Grade',
      render: (value: number) => `Grade ${value}`
    },
    {
      key: 'academicYear',
      header: 'Academic Year'
    },
    ...(userRole === 'InstituteAdmin'
      ? [
          {
            key: 'actions',
            header: 'Actions',
            render: (value: any, row: ClassData) => (
              <div className="flex items-center gap-2">
                {row.classTeacher ? (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      const fullName = `${row.classTeacher?.firstName || ''} ${row.classTeacher?.lastName || ''}`.trim() || 'Teacher';
                      setConfirmRemoveDialog({ open: true, classId: row.id, teacherName: fullName });
                    }}
                    disabled={unassigningClassId === row.id || !!assigningTeacherId}
                    className="h-8 px-3"
                    title="Remove teacher"
                  >
                    {unassigningClassId === row.id ? (
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <UserMinus className="h-4 w-4 mr-1" />
                    )}
                    {unassigningClassId === row.id ? 'Removing...' : 'Remove'}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAssignTeacher(row.id)}
                    disabled={assigningTeacherId === row.id || !!unassigningClassId}
                    className="h-8 px-3"
                    title="Assign teacher"
                  >
                    {assigningTeacherId === row.id ? (
                      <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-1" />
                    )}
                    {assigningTeacherId === row.id ? 'Assigning...' : 'Assign'}
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => handleViewCode(row.id)}
                  disabled={loadingCodeId === row.id}
                  className="h-8 px-3 hover:opacity-90"
                  style={{ backgroundColor: '#06923E' }}
                >
                  {loadingCodeId === row.id ? (
                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <QrCode className="h-4 w-4 mr-1" />
                  )}
                  Code
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleEditClass(row)} className="h-8 w-8 p-0">
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            )
          }
        ]
      : [])
  ];
  return <div className="container mx-auto p-6 space-y-6">
      {/* Search Bar */}
      

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Classes</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage institute classes and their details
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setShowFilters(!showFilters)} variant="outline" size="sm" className={showFilters ? "bg-primary/10" : ""}>
            <Filter className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
          
          <Button onClick={handleRefresh} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{loading ? 'Loading...' : 'Refresh'}</span>
          </Button>
          
          {canCreate && <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Create Class</span>
                  <span className="sm:hidden">Create</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Class</DialogTitle>
                </DialogHeader>
                <CreateClassForm onSubmit={handleCreateClass} onCancel={handleCancelCreate} />
              </DialogContent>
            </Dialog>}

          {/* Update Class Dialog */}
          <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Update Class</DialogTitle>
              </DialogHeader>
              {selectedClass && <UpdateClassForm classData={selectedClass} onSubmit={handleUpdateClass} onCancel={handleCancelUpdate} />}
            </DialogContent>
          </Dialog>

          {/* Teacher Selector Dialog */}
          <TeacherSelectorDialog isOpen={isTeacherSelectorOpen} onClose={() => {
          setIsTeacherSelectorOpen(false);
          setSelectedClassForTeacher('');
        }} onSelect={handleTeacherSelect} title="Assign Class Teacher" description="Select a teacher to assign as the class teacher" />

          {/* View Enrollment Code Dialog */}
          <Dialog open={isViewCodeDialogOpen} onOpenChange={setIsViewCodeDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Enrollment Code</DialogTitle>
              </DialogHeader>
              {enrollmentCodeData && <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-sm text-muted-foreground mb-2">Class Enrollment Code</div>
                    <div className="text-3xl font-bold font-mono tracking-wider">
                      {enrollmentCodeData.enrollmentCode}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded">
                      <span className="text-sm text-muted-foreground">Enrollment Enabled</span>
                      <Badge variant={enrollmentCodeData.enrollmentEnabled ? "default" : "secondary"}>
                        {enrollmentCodeData.enrollmentEnabled ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded">
                      <span className="text-sm text-muted-foreground">Requires Verification</span>
                      <Badge variant={enrollmentCodeData.requireTeacherVerification ? "default" : "secondary"}>
                        {enrollmentCodeData.requireTeacherVerification ? "Yes" : "No"}
                      </Badge>
                    </div>
                  </div>
                  <Button onClick={() => {
                navigator.clipboard.writeText(enrollmentCodeData.enrollmentCode);
                toast({
                  title: "Copied!",
                  description: "Enrollment code copied to clipboard"
                });
              }} className="w-full">
                    Copy Code
                  </Button>
                </div>}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter Section */}
      {showFilters && <Card className="border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter Options
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowFilters(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input placeholder="Class Name, Grade, Specialty..." value={searchTerm} onChange={e => {
                setSearchTerm(e.target.value);
                setPage(0); // Reset to first page when searching
              }} className="pl-10" />
                </div>
              </div>

              {/* Grade Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Grade</label>
                <Select value={selectedGrade} onValueChange={value => {
              setSelectedGrade(value);
              setPage(0); // Reset to first page when grade filter changes
            }}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Grades" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map(grade => <SelectItem key={grade} value={grade.toString()}>
                        Grade {grade}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Filter Actions */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Actions</label>
                <div className="flex gap-2">
                  <Button onClick={handleClearFilters} variant="outline" size="sm" className="flex-1">
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>}

      <MUITable title="Classes" data={paginatedClasses} columns={columns.map(col => ({
      id: col.key,
      label: col.header,
      minWidth: col.key === 'actions' ? 200 : 170,
      format: col.render
    }))} onAdd={canAdd ? () => setIsCreateDialogOpen(true) : undefined} onEdit={!isInstituteAdmin && canEdit ? handleEditClass : undefined} onDelete={!isInstituteAdmin && canDelete ? handleDeleteClass : undefined} page={page} rowsPerPage={rowsPerPage} totalCount={filteredClasses.length} // Use filtered total count
    onPageChange={(newPage: number) => {
      console.log('Changing page to:', newPage);
      setPage(newPage);
    }} onRowsPerPageChange={(newRowsPerPage: number) => {
      console.log('Changing rows per page to:', newRowsPerPage);
      setRowsPerPage(newRowsPerPage);
      setPage(0); // Reset to first page
      fetchClasses(false, newRowsPerPage); // Refetch with new limit
    }} sectionType="classes" allowAdd={canAdd} allowEdit={!isInstituteAdmin && canEdit} allowDelete={!isInstituteAdmin && canDelete} />

      {/* Image Preview Dialog */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-2xl p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>{previewImage?.title}</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            {previewImage && (
              <img 
                src={previewImage.url} 
                alt={previewImage.title}
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Remove Teacher Dialog */}
      <Dialog open={confirmRemoveDialog.open} onOpenChange={(open) => setConfirmRemoveDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Teacher</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <span className="font-semibold">{confirmRemoveDialog.teacherName}</span> as the class teacher?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmRemoveDialog({ open: false, classId: '', teacherName: '' })}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                handleUnassignTeacher(confirmRemoveDialog.classId);
                setConfirmRemoveDialog({ open: false, classId: '', teacherName: '' });
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
};
export default Classes;