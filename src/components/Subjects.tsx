import React, { useState } from 'react';
import MUITable from '@/components/ui/mui-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { getImageUrl } from '@/utils/imageUrlHelper';

import { RefreshCw, Filter, Eye, Edit, Trash2, Plus, UserPlus, UserMinus } from 'lucide-react';
import { useAuth, type UserRole } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { AccessControl } from '@/utils/permissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import CreateSubjectForm from '@/components/forms/CreateSubjectForm';
import AssignSubjectToClassForm from '@/components/forms/AssignSubjectToClassForm';
import { useTableData } from '@/hooks/useTableData';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { TeacherSelectorDialog } from '@/components/dialogs/TeacherSelectorDialog';
import { instituteApi } from '@/api/institute.api';
interface TeacherInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  imageUrl?: string;
}

interface SubjectData {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  creditHours: number;
  isActive: boolean;
  subjectType: string;
  basketCategory: string;
  instituteType: string | null;
  imgUrl: string | null;
  createdAt: string;
  updatedAt: string;
  teacherId?: string;
  teacher?: TeacherInfo | null;
  instituteId?: string;
  classId?: string;
  subjectId?: string;
}
const Subjects = () => {
  const {
    user,
    selectedInstitute,
    selectedClass,
    selectedSubject,
    selectedInstituteType,
    currentInstituteId,
    currentClassId,
    currentSubjectId
  } = useAuth();
  const {
    toast
  } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedSubjectData, setSelectedSubjectData] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const userRole = useInstituteRole();

  // Teacher assignment state
  const [isTeacherSelectorOpen, setIsTeacherSelectorOpen] = useState(false);
  const [selectedSubjectForTeacher, setSelectedSubjectForTeacher] = useState<{
    subjectId: string;
    instituteId: string;
    classId: string;
  } | null>(null);
  const [isAssigningTeacher, setIsAssigningTeacher] = useState(false);
  const [isUnassigningTeacher, setIsUnassigningTeacher] = useState(false);
  const [showUnassignConfirm, setShowUnassignConfirm] = useState(false);
  const [subjectToUnassign, setSubjectToUnassign] = useState<SubjectData | null>(null);

  // Enhanced pagination with useTableData hook - fetch from correct endpoint
  const isClassLevel = !!currentClassId;
  const endpoint = isClassLevel && currentInstituteId && currentClassId
    ? `/institutes/${currentInstituteId}/classes/${currentClassId}/subjects`
    : '/subjects/all';

  const tableData = useTableData<SubjectData>({
    endpoint,
    defaultParams: isClassLevel ? {} : {
      ...(selectedInstituteType && {
        instituteType: selectedInstituteType
      })
    },
    cacheOptions: {
      ttl: 15,
      userId: user?.id,
      role: userRole || 'User',
      instituteId: currentInstituteId || undefined,
      classId: currentClassId || undefined
    },
    dependencies: [currentInstituteId, currentClassId], // Reload when context changes
    pagination: {
      defaultLimit: 50,
      availableLimits: [25, 50, 100]
    },
    autoLoad: true,
  });
  const {
    state: {
      data: subjectsData,
      loading: isLoading
    },
    pagination,
    actions
  } = tableData;
  
  // Transform nested API response to flattened structure for table
  const transformedData = subjectsData.map((item: any) => ({
    ...item.subject,
    teacher: item.teacher,
    teacherId: item.teacherId,
    instituteId: item.instituteId,
    classId: item.classId,
    subjectId: item.subjectId || item.subject?.id
  }));
  
  const dataLoaded = subjectsData.length > 0;
  const isInstituteAdmin = userRole === 'InstituteAdmin';
  const canEdit = AccessControl.hasPermission(userRole, 'edit-subject') && !isInstituteAdmin;
  const canDelete = AccessControl.hasPermission(userRole, 'delete-subject') && !isInstituteAdmin;
  const canCreate = userRole === 'InstituteAdmin';
  const canAssignSubjects = userRole === 'InstituteAdmin' || userRole === 'Teacher';
  const handleLoadData = async () => {
    if (!currentInstituteId) {
      toast({
        title: "Error",
        description: "Please select an institute first.",
        variant: "destructive"
      });
      return;
    }

    // Update filters and reload data
    const newFilters = {
      ...(selectedInstituteType && {
        instituteType: selectedInstituteType
      })
    };
    actions.updateFilters(newFilters);
    actions.refresh();
  };
  const getBaseUrl = () => {
    return import.meta.env.VITE_LMS_BASE_URL || 'http://localhost:8080';
  };

  const resolveImageUrl = (url?: string | null) => {
    if (!url) return '/placeholder.svg';
    return getImageUrl(url);
  };

  const handleAssignTeacher = (subject: SubjectData) => {
    if (!currentInstituteId || !currentClassId) {
      toast({
        title: "Error",
        description: "Please select a class first to assign teachers to subjects",
        variant: "destructive"
      });
      return;
    }
    setSelectedSubjectForTeacher({
      subjectId: subject.subjectId || subject.id,
      instituteId: subject.instituteId || currentInstituteId,
      classId: subject.classId || currentClassId
    });
    setIsTeacherSelectorOpen(true);
  };

  const handleUnassignTeacher = (subject: SubjectData) => {
    if (!currentInstituteId || !currentClassId) {
      toast({
        title: "Error",
        description: "Please select a class first to manage subject teachers",
        variant: "destructive"
      });
      return;
    }
    setSubjectToUnassign(subject);
    setShowUnassignConfirm(true);
  };

  const confirmUnassignTeacher = async () => {
    if (!subjectToUnassign || isUnassigningTeacher) return;

    try {
      setIsUnassigningTeacher(true);
      await instituteApi.unassignTeacherFromSubject(
        subjectToUnassign.instituteId || currentInstituteId!,
        subjectToUnassign.classId || currentClassId!,
        subjectToUnassign.subjectId || subjectToUnassign.id
      );
      toast({
        title: "Success",
        description: "Teacher unassigned successfully"
      });
      setShowUnassignConfirm(false);
      setSubjectToUnassign(null);
      actions.refresh();
    } catch (error) {
      console.error('Error unassigning teacher:', error);
      toast({
        title: "Error",
        description: "Failed to unassign teacher",
        variant: "destructive"
      });
    } finally {
      setIsUnassigningTeacher(false);
    }
  };

  const handleTeacherSelect = async (teacherId: string) => {
    if (!selectedSubjectForTeacher || isAssigningTeacher) return;

    try {
      setIsAssigningTeacher(true);
      await instituteApi.assignTeacherToSubject(
        selectedSubjectForTeacher.instituteId,
        selectedSubjectForTeacher.classId,
        selectedSubjectForTeacher.subjectId,
        teacherId
      );
      toast({
        title: "Success",
        description: "Teacher assigned successfully"
      });
      actions.refresh();
    } catch (error) {
      console.error('Error assigning teacher:', error);
      toast({
        title: "Error",
        description: "Failed to assign teacher",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsAssigningTeacher(false);
    }
  };

  const subjectsColumns = [{
    id: 'imgUrl',
    key: 'imgUrl',
    header: 'Image',
    format: (value: string | null, row: any) => (
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted">
        <img
          src={resolveImageUrl(row?.imgUrl || value)}
          alt={row?.name ? `Subject ${row.name}` : 'Subject image'}
          className="w-full h-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder.svg'; }}
        />
      </div>
    )
  }, {
    key: 'code',
    header: 'Code'
  }, {
    key: 'name',
    header: 'Name',
    format: (value: string | null) => value || <span className="text-muted-foreground italic">No name</span>
  }, {
    key: 'description',
    header: 'Description',
    format: (value: string | null) => value || <span className="text-muted-foreground italic">No description</span>
  }, {
    key: 'category',
    header: 'Category',
    format: (value: string | null) => value || <span className="text-muted-foreground italic">N/A</span>
  }, {
    key: 'creditHours',
    header: 'Credit Hours',
    format: (value: number | null) => value !== null && value !== undefined ? value : <span className="text-muted-foreground italic">N/A</span>
  }, {
    key: 'subjectType',
    header: 'Type',
    format: (value: string | null) => value || <span className="text-muted-foreground italic">N/A</span>
  }, {
    key: 'teacher',
    header: 'Teacher',
    format: (value: TeacherInfo | null, row: SubjectData) => (
      <div className="min-w-[180px]">
        {isClassLevel ? (
          value ? (
            <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
                <AvatarImage src={getImageUrl(value.imageUrl)} alt={value.firstName ? `${value.firstName} ${value.lastName}` : 'Teacher'} />
                <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                  {value.firstName?.[0] || 'T'}{value.lastName?.[0] || 'R'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">
                  {value.firstName} {value.lastName}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {value.email}
                </div>
              </div>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">No teacher</span>
          )
        ) : (
          <span className="text-sm text-muted-foreground italic">Select a class to view</span>
        )}
      </div>
    )
  }, {
    key: 'isActive',
    header: 'Status',
    render: (value: boolean) => <Badge variant={value ? 'default' : 'secondary'}>
          {value ? 'Active' : 'Inactive'}
        </Badge>
  }, ...(isInstituteAdmin && isClassLevel ? [{
    key: 'teacherActions',
    header: 'Teacher Actions',
    format: (value: any, row: SubjectData) => (
      <div className="flex items-center gap-2">
        {row.teacher ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleUnassignTeacher(row)}
            disabled={isUnassigningTeacher || isAssigningTeacher}
            className="h-8 px-3"
            title="Remove teacher"
          >
            <UserMinus className="h-4 w-4 mr-1" />
            Remove
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAssignTeacher(row)}
            disabled={isUnassigningTeacher || isAssigningTeacher}
            className="h-8 px-3"
            title="Assign teacher"
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Assign
          </Button>
        )}
      </div>
    )
  }] : [])];
  const handleCreateSubject = async (subjectData: any) => {
    if (!currentInstituteId) {
      toast({
        title: "Error",
        description: "Please select an institute first.",
        variant: "destructive"
      });
      return;
    }
    try {
      toast({
        title: "Subject Created",
        description: `Subject ${subjectData.name} has been created successfully.`
      });
      setIsCreateDialogOpen(false);
      // Refresh data after creation
      actions.refresh();
    } catch (error: any) {
      console.error('Error in handleCreateSubject:', error);
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create subject.",
        variant: "destructive"
      });
    }
  };
  const handleEditSubject = (subject: any) => {
    console.log('Edit subject:', subject);
    setSelectedSubjectData(subject);
    setIsEditDialogOpen(true);
  };
  const handleUpdateSubject = (subjectData: any) => {
    console.log('Updating subject:', subjectData);
    toast({
      title: "Subject Updated",
      description: `Subject ${subjectData.name} has been updated successfully.`
    });
    setIsEditDialogOpen(false);
    setSelectedSubjectData(null);
    // Refresh data after update
    actions.refresh();
  };
  const handleDeleteSubject = (subject: any) => {
    console.log('Delete subject:', subject);
    toast({
      title: "Subject Deleted",
      description: `Subject ${subject.name} has been deleted.`,
      variant: "destructive"
    });
  };
  const handleViewSubject = (subject: any) => {
    console.log('View subject details:', subject);
    toast({
      title: "View Subject",
      description: `Viewing subject: ${subject.name}`
    });
  };
  const getContextTitle = () => {
    const contexts = [];
    if (selectedInstitute) {
      contexts.push(selectedInstitute.name);
    }
    if (selectedClass) {
      contexts.push(selectedClass.name);
    }
    if (selectedSubject) {
      contexts.push(selectedSubject.name);
    }
    let title = 'Subjects Management';
    if (contexts.length > 0) {
      title += ` (${contexts.join(' → ')})`;
    }
    return title;
  };
  const customActions = isInstituteAdmin ? [] : [{
    label: 'View',
    action: (subject: any) => handleViewSubject(subject),
    icon: <Eye className="h-3 w-3" />,
    variant: 'outline' as const
  }, ...(canEdit ? [{
    label: 'Edit',
    action: (subject: any) => handleEditSubject(subject),
    icon: <Edit className="h-3 w-3" />,
    variant: 'outline' as const
  }] : []), ...(canDelete ? [{
    label: 'Delete',
    action: (subject: any) => handleDeleteSubject(subject),
    icon: <Trash2 className="h-3 w-3" />,
    variant: 'destructive' as const
  }] : [])];
  return <div className="space-y-6">
          <div className="text-center sm:text-left flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {getContextTitle()}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {isClassLevel 
                ? "Manage class subjects, assign teachers, and configure subject settings"
                : "Manage academic subjects and curriculum planning. Select a class to assign teachers."
              }
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
              </Button>
              
              <Button variant="outline" size="sm" onClick={() => actions.refresh()} disabled={isLoading} className="flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              
              {canCreate && <Button onClick={() => setIsCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2" size="sm">
                   <Plus className="h-4 w-4" />
                   <span className="hidden sm:inline">Create Subject</span>
                   <span className="sm:hidden">Create</span>
                 </Button>}
                
                {(userRole === 'InstituteAdmin' || canAssignSubjects) && (
                  <Button onClick={() => setIsAssignDialogOpen(true)} style={{ backgroundColor: '#06923E' }} className="hover:opacity-90 text-white flex items-center gap-2" size="sm">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Assign Subject</span>
                    <span className="sm:hidden">Assign</span>
                  </Button>
                 )}
            </div>
          </div>

          {showFilters && <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border mb-6">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Search Subjects
                </label>
                <Input placeholder="Search subjects..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full" />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Status
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Category
                </label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Core">Core</SelectItem>
                    <SelectItem value="Optional">Optional</SelectItem>
                    <SelectItem value="Elective">Elective</SelectItem>
                    <SelectItem value="Mandatory">Mandatory</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>}

          {/* Unified Table View for all devices */}
          <div className="w-full overflow-x-auto">
            <MUITable
              title="Subjects"
              data={transformedData || []}
              columns={subjectsColumns.map(col => ({
                id: col.key,
                label: col.header,
                minWidth: 170,
                format: col.render || col.format
              }))}
              onEdit={!isInstituteAdmin && canEdit ? handleEditSubject : undefined}
              onDelete={!isInstituteAdmin && canDelete ? handleDeleteSubject : undefined}
              onView={!isInstituteAdmin ? handleViewSubject : undefined}
              page={pagination.page}
              rowsPerPage={pagination.limit}
              totalCount={pagination.totalCount}
              onPageChange={(newPage: number) => actions.setPage(newPage)}
              onRowsPerPageChange={(newLimit: number) => actions.setLimit(newLimit)}
              sectionType="subjects"
              allowEdit={!isInstituteAdmin && canEdit}
              allowDelete={!isInstituteAdmin && canDelete}
            />
          </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Subject</DialogTitle>
          </DialogHeader>
          <CreateSubjectForm onSubmit={handleCreateSubject} onCancel={() => setIsCreateDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Subject</DialogTitle>
          </DialogHeader>
          <CreateSubjectForm initialData={selectedSubjectData} onSubmit={handleUpdateSubject} onCancel={() => {
          setIsEditDialogOpen(false);
          setSelectedSubjectData(null);
        }} />
        </DialogContent>
      </Dialog>

      {/* Assign Subject Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Subjects to Class</DialogTitle>
          </DialogHeader>
          <AssignSubjectToClassForm onSuccess={() => {
          setIsAssignDialogOpen(false);
          toast({
            title: "Success",
            description: "Subjects assigned successfully!"
          });
        }} onCancel={() => setIsAssignDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Teacher Selector Dialog */}
      <TeacherSelectorDialog
        isOpen={isTeacherSelectorOpen}
        onClose={() => {
          if (!isAssigningTeacher) {
            setIsTeacherSelectorOpen(false);
            setSelectedSubjectForTeacher(null);
          }
        }}
        onSelect={handleTeacherSelect}
        title="Assign Subject Teacher"
        description="Select a teacher to assign to this subject"
      />

      {/* Unassign Teacher Confirmation Dialog */}
      <AlertDialog open={showUnassignConfirm} onOpenChange={(open) => !isUnassigningTeacher && setShowUnassignConfirm(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Teacher Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{subjectToUnassign?.teacher?.firstName} {subjectToUnassign?.teacher?.lastName}</strong> from teaching <strong>{subjectToUnassign?.name}</strong>?
              <br /><br />
              This will unassign the teacher from this subject but will not delete any related data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnassigningTeacher}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnassignTeacher}
              disabled={isUnassigningTeacher}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUnassigningTeacher ? 'Removing...' : 'Remove Teacher'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};
export default Subjects;