import React, { useState, useEffect } from 'react';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { useRefreshWithCooldown } from '@/hooks/useRefreshWithCooldown';
import MUITable from '@/components/ui/mui-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Filter, Plus, Calendar, Clock, BookOpen, FileText, Upload, ExternalLink, BarChart3, Eye, Edit, Users } from 'lucide-react';
import { useAuth, type UserRole } from '@/contexts/AuthContext';
import { AccessControl } from '@/utils/permissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import CreateHomeworkForm from '@/components/forms/CreateHomeworkForm';
import UpdateHomeworkForm from '@/components/forms/UpdateHomeworkForm';
import SubmitHomeworkForm from '@/components/forms/SubmitHomeworkForm';
import HomeworkDetailsDialog from '@/components/forms/HomeworkDetailsDialog';
import { DataCardView } from '@/components/ui/data-card-view';
import { useNavigate } from 'react-router-dom';
import { homeworkApi } from '@/api/homework.api';

interface HomeworkProps {
  apiLevel?: 'institute' | 'class' | 'subject';
}

const Homework = ({ apiLevel = 'institute' }: HomeworkProps) => {
  const navigate = useNavigate();
  const { user, selectedInstitute, selectedClass, selectedSubject, currentInstituteId, currentClassId, currentSubjectId } = useAuth();
  const instituteRole = useInstituteRole();
  const { toast } = useToast();
  const { refresh, isRefreshing, canRefresh, cooldownRemaining } = useRefreshWithCooldown(10);
  
  // DEBUG: Log role and institute information
  console.log('🔍 HOMEWORK DEBUG:', {
    instituteRole,
    selectedInstitute,
    'selectedInstitute.userRole': selectedInstitute?.userRole,
    'selectedInstitute.instituteUserType': (selectedInstitute as any)?.instituteUserType
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  const [selectedHomeworkData, setSelectedHomeworkData] = useState<any>(null);
  const [homeworkData, setHomeworkData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Pagination states
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Track current context to prevent unnecessary reloads
  const contextKey = `${currentInstituteId}-${currentClassId}-${currentSubjectId}`;
  const [lastLoadedContext, setLastLoadedContext] = useState<string>('');

  // Auto-load homework when subject is selected
  useEffect(() => {
    if (currentInstituteId && currentClassId && currentSubjectId && contextKey !== lastLoadedContext) {
      setLastLoadedContext(contextKey);
      handleLoadData(false); // Auto-load from cache
    }
  }, [contextKey]);

  const buildQueryParams = () => {
    const userRole = instituteRole;
    const params: Record<string, any> = {
      page: page + 1, // MUI pagination is 0-based, API is 1-based
      limit: rowsPerPage,
      userId: user?.id,
      role: userRole
    };

    // Add context-aware filtering
    if (currentInstituteId) {
      params.instituteId = currentInstituteId;
    }

    if (currentClassId) {
      params.classId = currentClassId;
    }

    if (currentSubjectId) {
      params.subjectId = currentSubjectId;
    }

    // For Teachers, add teacherId parameter
    if (userRole === 'Teacher' && user?.id) {
      params.teacherId = user.id;
    }

    // Add filter parameters
    if (searchTerm.trim()) {
      params.search = searchTerm.trim();
    }

    if (statusFilter !== 'all') {
      params.status = statusFilter;
    }

    return params;
  };

  const handleLoadData = async (forceRefresh = false) => {
    const userRole = instituteRole;
    const params = buildQueryParams();
    
    if (userRole === 'Student') {
      // For students: require all context
      if (!currentInstituteId || !currentClassId || !currentSubjectId) {
        toast({
          title: "Missing Selection",
          description: "Please select institute, class, and subject to view homework.",
          variant: "destructive"
        });
        return;
      }
    } else if (userRole === 'InstituteAdmin' || userRole === 'Teacher') {
      // For InstituteAdmin and Teacher: require context
      if (!currentInstituteId || !currentClassId || !currentSubjectId) {
        toast({
          title: "Missing Selection",
          description: "Please select institute, class, and subject to view homework.",
          variant: "destructive"
        });
        return;
      }
    }

    setIsLoading(true);
    console.log(`📚 Loading homework with secure caching - Role: ${userRole}`, { forceRefresh, context: params });
    console.log(`Current context - Institute: ${selectedInstitute?.name}, Class: ${selectedClass?.name}, Subject: ${selectedSubject?.name}`);
    
    try {
      // Use enhanced homework API with automatic caching
      const result = await homeworkApi.getHomework(params, forceRefresh);

      console.log('✅ Homework loaded successfully:', result);
      
      // Handle both array response and paginated response
      const homework = Array.isArray(result) ? result : (result as any)?.data || [];
      const total = Array.isArray(result) ? result.length : (result as any)?.meta?.total || homework.length;
      
      setHomeworkData(homework);
      setTotalCount(total);
      setDataLoaded(true);
      setLastRefresh(new Date());
      
      if (forceRefresh) {
        toast({
          title: "Data Refreshed",
          description: `Successfully refreshed ${homework.length} homework assignments.`
        });
      }
    } catch (error) {
      console.error('❌ Failed to load homework:', error);
      toast({
        title: "Load Failed",
        description: "Failed to load homework data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshData = async () => {
    console.log('Force refreshing homework data...');
    await refresh(async () => {
      await handleLoadData(true);
    }, {
      successMessage: 'Homework data refreshed successfully'
    });
  };

  const handleCreateHomework = async () => {
    setIsCreateDialogOpen(false);
    // Force refresh after creating new homework
    await handleLoadData(true);
  };

  const handleEditHomework = async (homeworkData: any) => {
    console.log('Opening update homework dialog:', homeworkData);
    setSelectedHomeworkData(homeworkData);
    setIsEditDialogOpen(true);
  };

  const handleUpdateHomework = async () => {
    setIsEditDialogOpen(false);
    setSelectedHomeworkData(null);
    // Force refresh after updating homework
    await handleLoadData(true);
  };

  const handleDeleteHomework = async (homeworkData: any) => {
    console.log('🗑️ Deleting homework:', homeworkData);
    
    try {
      setIsLoading(true);
      
      // Use homework API with automatic cache invalidation
      await homeworkApi.deleteHomework(homeworkData.id, {
        instituteId: currentInstituteId,
        classId: currentClassId,
        subjectId: currentSubjectId
      });

      console.log('✅ Homework deleted successfully');
      
      toast({
        title: "Homework Deleted",
        description: `Homework ${homeworkData.title} has been deleted successfully.`,
        variant: "destructive"
      });
      
      // Force refresh after deletion
      await handleLoadData(true);
      
    } catch (error) {
      console.error('❌ Error deleting homework:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete homework. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewHomework = (homeworkData: any) => {
    console.log('View homework:', homeworkData);
    setSelectedHomeworkData(homeworkData);
    setIsViewDialogOpen(true);
  };

  const handleSubmitHomework = (homeworkData: any) => {
    console.log('Submit homework:', homeworkData);
    setSelectedHomeworkData(homeworkData);
    setIsSubmitDialogOpen(true);
  };

  const handleViewSubmissions = (homeworkData: any) => {
    console.log('View homework submissions:', homeworkData);
    
    // 🛡️ SECURE: Use full hierarchical URL
    if (!currentInstituteId || !currentClassId || !currentSubjectId) {
      toast({
        title: "Missing Context",
        description: "Please select institute, class, and subject first",
        variant: "destructive"
      });
      return;
    }
    
    navigate(`/institute/${currentInstituteId}/class/${currentClassId}/subject/${currentSubjectId}/homework/${homeworkData.id}/submissions`);
  };

  const handleSubmissionSuccess = async () => {
    setIsSubmitDialogOpen(false);
    setSelectedHomeworkData(null);
    toast({
      title: "Submission Successful",
      description: "Your homework has been submitted successfully!"
    });
    // Force refresh after successful submission
    await handleLoadData(true);
  };

  const canAdd = AccessControl.hasPermission(instituteRole, 'create-homework');
  const canEdit = instituteRole === 'Teacher' ? true : AccessControl.hasPermission(instituteRole, 'edit-homework');
  const canDelete = instituteRole === 'Teacher' ? true : AccessControl.hasPermission(instituteRole, 'delete-homework');
  const isStudent = instituteRole === 'Student';

  const homeworkColumns = [
    { key: 'id', header: 'ID', render: (value: any) => value || 'N/A' },
    { key: 'title', header: 'Title' },
    { key: 'description', header: 'Description' },
    { 
      key: 'teacher', 
      header: 'Teacher', 
      render: (value: any) => value ? (
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">{value.name || 'N/A'}</span>
          {value.phone && <span className="text-xs text-muted-foreground">{value.phone}</span>}
          {value.email && <span className="text-xs text-muted-foreground">{value.email}</span>}
        </div>
      ) : 'N/A'
    },
    { key: 'startDate', header: 'Start Date', render: (value: string) => value ? new Date(value).toLocaleDateString() : 'N/A' },
    { key: 'endDate', header: 'End Date', render: (value: string) => value ? new Date(value).toLocaleDateString() : 'N/A' },
    ...((['InstituteAdmin', 'Teacher', 'Student'] as UserRole[]).includes(instituteRole) ? [{
      key: 'referenceLink', 
      header: 'Reference', 
      render: (value: string, row: any) => value ? (
        <Button
          size="sm"
          variant="default"
          className="bg-blue-900 hover:bg-blue-800 text-white"
          onClick={() => window.open(value, '_blank')}
        >
          <FileText className="h-3 w-3 mr-1" />
          Reference
        </Button>
      ) : (
        <span className="text-gray-400">No reference</span>
      )
    }] : []),
    ...(instituteRole === 'InstituteAdmin' || instituteRole === 'Teacher' ? [{
      key: 'submissions',
      header: 'Submissions',
      render: (value: any, row: any) => (
        <Button
          size="sm"
          variant="default"
          onClick={() => handleViewSubmissions(row)}
        >
          <Users className="h-3 w-3 mr-1" />
          View
        </Button>
      )
    }] : [])
  ];

  // Custom actions based on user role
  const customActions = [
    // Actions for InstituteAdmin and Teacher
    ...((instituteRole === 'InstituteAdmin' || instituteRole === 'Teacher') ? [
      {
        label: '',
        action: (homework: any) => handleEditHomework(homework),
        icon: <Edit className="h-4 w-4" />,
        variant: 'outline' as const,
        tooltip: 'Edit homework'
      }
    ] : []),
    
    // Actions for Students
    ...(instituteRole === 'Student' ? [
      {
        label: 'Submit',
        action: (homework: any) => handleSubmitHomework(homework),
        icon: <Upload className="h-3 w-3" />,
        variant: 'default' as const,
        className: 'bg-primary hover:bg-primary/90 text-primary-foreground'
      }
    ] : [])
  ];

  const getTitle = () => {
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
    
    let title = 'Homework';
    if (contexts.length > 0) {
      title += ` (${contexts.join(' → ')})`;
    }
    
    return title;
  };

  // Filter the homework based on local filters for mobile view
  const filteredHomework = homeworkData.filter(homework => {
    const matchesSearch = !searchTerm || 
      Object.values(homework).some(value => 
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && homework.isActive) ||
      (statusFilter === 'inactive' && !homework.isActive);
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {!dataLoaded ? (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {getTitle()}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {instituteRole === 'Student' && (!currentInstituteId || !currentClassId || !currentSubjectId)
              ? 'Please select institute, class, and subject to view homework.'
              : 'Click the button below to load homework data'
            }
          </p>
          <Button 
            onClick={() => handleLoadData(false)} 
            disabled={isLoading || (instituteRole === 'Student' && (!currentInstituteId || !currentClassId || !currentSubjectId))}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Loading Data...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Load Data
              </>
            )}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {getTitle()}
              </h1>
              {lastRefresh && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Last refreshed: {lastRefresh.toLocaleTimeString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
              </Button>
              <Button 
                onClick={handleRefreshData} 
                disabled={isLoading || isRefreshing || !canRefresh}
                variant="outline"
                size="sm"
                title={!canRefresh ? `Please wait ${cooldownRemaining} seconds` : 'Refresh data from server'}
              >
                {isLoading || isRefreshing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : !canRefresh ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Wait ({cooldownRemaining}s)
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Data
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Filter Controls */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Search Homework
                </label>
                <Input
                  placeholder="Search homework..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
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

              <div className="flex items-end col-span-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          )}

          {/* Add Create Button for InstituteAdmin and Teacher */}
          {(instituteRole === 'InstituteAdmin' || instituteRole === 'Teacher') && canAdd && (
            <div className="flex justify-end mb-4">
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Homework
              </Button>
            </div>
          )}

          {/* MUI Table View - All Screen Sizes */}
          <MUITable
            title=""
            data={homeworkData}
            columns={homeworkColumns.map(col => ({
              id: col.key,
              label: col.header,
              minWidth: 170,
              format: col.render
            }))}
            onAdd={canAdd ? () => setIsCreateDialogOpen(true) : undefined}
            onEdit={isStudent ? handleSubmitHomework : (canEdit ? handleEditHomework : undefined)}
            page={page}
            rowsPerPage={rowsPerPage}
            totalCount={totalCount}
            onPageChange={(newPage: number) => {
              setPage(newPage);
              handleLoadData(false);
            }}
            onRowsPerPageChange={(newRowsPerPage: number) => {
              setRowsPerPage(newRowsPerPage);
              setPage(0);
              handleLoadData(false);
            }}
            sectionType="homework"
            allowEdit={canEdit && !isStudent}
            allowDelete={canDelete && !isStudent}
          />
        </>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Homework</DialogTitle>
          </DialogHeader>
          <CreateHomeworkForm 
            onSuccess={handleCreateHomework}
            onClose={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Homework</DialogTitle>
          </DialogHeader>
          {selectedHomeworkData && (
            <UpdateHomeworkForm 
              homework={selectedHomeworkData}
              onSuccess={handleUpdateHomework}
              onClose={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Submit Dialog */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submit Homework</DialogTitle>
          </DialogHeader>
          {selectedHomeworkData && (
            <SubmitHomeworkForm 
              homework={selectedHomeworkData}
              onSuccess={handleSubmissionSuccess}
              onClose={() => setIsSubmitDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Homework Details Dialog */}
      <HomeworkDetailsDialog
        isOpen={isViewDialogOpen}
        onClose={() => {
          setIsViewDialogOpen(false);
          setSelectedHomeworkData(null);
        }}
        homework={selectedHomeworkData}
      />

    </div>
  );
};

export default Homework;
