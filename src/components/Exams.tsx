import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MUITable from '@/components/ui/mui-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Filter, Plus, Calendar, Clock, FileText, CheckCircle, ExternalLink, BarChart3, Eye } from 'lucide-react';
import { useAuth, type UserRole } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { AccessControl } from '@/utils/permissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import CreateExamForm from '@/components/forms/CreateExamForm';
import { UpdateExamForm } from '@/components/forms/UpdateExamForm';
import CreateResultsForm from '@/components/forms/CreateResultsForm';
import { DataCardView } from '@/components/ui/data-card-view';
import { useTableData } from '@/hooks/useTableData';
import { cachedApiClient } from '@/api/cachedClient';
interface ExamsProps {
  apiLevel?: 'institute' | 'class' | 'subject';
}
const Exams = ({
  apiLevel = 'institute'
}: ExamsProps) => {
  const navigate = useNavigate();
  const {
    user,
    selectedInstitute,
    selectedClass,
    selectedSubject,
    currentInstituteId,
    currentClassId,
    currentSubjectId
  } = useAuth();
  const {
    toast
  } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isCreateResultsDialogOpen, setIsCreateResultsDialogOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<any>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const userRole = useInstituteRole();

  // Memoize default params to prevent unnecessary re-renders
  const defaultParams = useMemo(() => {
    const params: Record<string, any> = {};

    if (currentInstituteId) {
      params.instituteId = currentInstituteId;
    }
    if (currentClassId) {
      params.classId = currentClassId;
    }
    if (currentSubjectId) {
      params.subjectId = currentSubjectId;
    }

    if (userRole === 'Teacher' && user?.id) {
      params.teacherId = user.id;
    }
    return params;
  }, [currentInstituteId, currentClassId, currentSubjectId, userRole, user?.id]);

  // Enhanced pagination with useTableData hook
  const {
    state: {
      data: examsData,
      loading: isLoading
    },
    pagination,
    actions: {
      refresh,
      updateFilters,
      setPage,
      setLimit
    },
    filters
  } = useTableData({
    endpoint: '/institute-class-subject-exams',
    defaultParams,
    dependencies: [currentInstituteId, currentClassId, currentSubjectId], // Auto-reload on context changes
    pagination: {
      defaultLimit: 50,
      availableLimits: [25, 50, 100]
    },
    autoLoad: true // Enable auto-loading from cache
  });

  // Track if we've attempted to load data at least once - auto-load when context is ready
  const [hasAttemptedLoad, setHasAttemptedLoad] = React.useState(false);

  // Auto-load when context is ready
  React.useEffect(() => {
    if (currentInstituteId && currentClassId && currentSubjectId && !hasAttemptedLoad) {
      setHasAttemptedLoad(true);
      refresh();
    }
  }, [currentInstituteId, currentClassId, currentSubjectId]);

  const handleLoadData = async (forceRefresh = false) => {
    // For students: require all context selections
    if (userRole === 'Student') {
      if (!currentInstituteId || !currentClassId || !currentSubjectId) {
        toast({
          title: "Missing Selection",
          description: "Please select institute, class, and subject to view exams.",
          variant: "destructive"
        });
        return;
      }
    }

    // For InstituteAdmin and Teacher: require at least institute selection
    if (userRole === 'InstituteAdmin' || userRole === 'Teacher') {
      if (!currentInstituteId) {
        toast({
          title: "Selection Required",
          description: "Please select an institute to view exams.",
          variant: "destructive"
        });
        return;
      }
    }
    setHasAttemptedLoad(true);
    
    // Update filters and load data
    updateFilters(defaultParams);    // Trigger data loading using the actions from useTableData
    refresh();
  };
  const handleRefreshData = async () => {
    console.log('Force refreshing exams data...');
    refresh();
    setLastRefresh(new Date());
  };
  const handleCreateExam = async () => {
    setIsCreateDialogOpen(false);
    // Force refresh after creating new exam
    refresh();
  };
  const handleEditExam = (examData: any) => {
    setSelectedExam(examData);
    setIsUpdateDialogOpen(true);
  };
  const handleUpdateExam = () => {
    handleRefreshData();
    setIsUpdateDialogOpen(false);
    setSelectedExam(null);
  };
  const handleViewResults = (examData: any) => {
    // Use context from exam data if available, otherwise use current context
    const instId = examData.instituteId || examData.institute?.id || currentInstituteId;
    const clsId = examData.classId || examData.class?.id || currentClassId;
    const subId = examData.subjectId || examData.subject?.id || currentSubjectId;
    const examId = examData.id;
    
    console.log('View Results clicked:', { examData, instId, clsId, subId, examId });
    
    if (!instId || !clsId || !subId || !examId) {
      toast({
        title: "Missing Context",
        description: "Please select institute, class, and subject first",
        variant: "destructive"
      });
      return;
    }
    
    const url = `/institute/${instId}/class/${clsId}/subject/${subId}/exam/${examId}/results`;
    console.log('Navigating to:', url);
    navigate(url);
  };
  const handleDeleteExam = async (examData: any) => {
    console.log('Deleting exam:', examData);
    try {
      // Use cached client for delete (will clear related cache)
      await cachedApiClient.delete(`/institute-class-subject-exams/${examData.id}`);
      console.log('Exam deleted successfully');
      toast({
        title: "Exam Deleted",
        description: `Exam ${examData.title} has been deleted successfully.`,
        variant: "destructive"
      });

      // Force refresh after deletion
      refresh();
    } catch (error) {
      console.error('Error deleting exam:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete exam. Please try again.",
        variant: "destructive"
      });
    }
  };
  const handleCreateResults = () => {
    console.log('Create results clicked');
    setIsCreateResultsDialogOpen(true);
  };
  const examsColumns = [{
    key: 'title',
    header: 'Title'
  }, {
    key: 'description',
    header: 'Description'
  }, {
    key: 'examType',
    header: 'Type',
    render: (value: string) => <Badge variant={value === 'online' ? 'default' : 'secondary'}>
          {value}
        </Badge>
  }, {
    key: 'durationMinutes',
    header: 'Duration (min)',
    render: (value: number) => `${value} minutes`
  }, {
    key: 'totalMarks',
    header: 'Total Marks'
  }, {
    key: 'passingMarks',
    header: 'Passing Marks'
  }, {
    key: 'scheduleDate',
    header: 'Schedule Date',
    render: (value: string) => value ? new Date(value).toLocaleDateString() : 'Not set'
  }, {
    key: 'startTime',
    header: 'Start Time',
    render: (value: string) => value ? new Date(value).toLocaleString() : 'Not set'
  }, {
    key: 'endTime',
    header: 'End Time',
    render: (value: string) => value ? new Date(value).toLocaleString() : 'Not set'
  }, {
    key: 'venue',
    header: 'Venue'
  }, ...((['InstituteAdmin', 'Teacher', 'Student'] as UserRole[]).includes(userRole) ? [{
    key: 'examLink',
    header: 'Exam Link',
    render: (value: string, row: any) => value ? <Button size="sm" variant="destructive" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => window.open(value, '_blank')}>
          <ExternalLink className="h-3 w-3 mr-1" />
          Exam Link
        </Button> : <span className="text-gray-400">No link</span>
  }] : []), {
    key: 'status',
    header: 'Status',
    render: (value: string) => <Badge variant={value === 'scheduled' ? 'default' : value === 'draft' ? 'secondary' : value === 'completed' ? 'outline' : 'destructive'}>
          {value}
        </Badge>
  }, ...((['InstituteAdmin', 'Teacher'] as UserRole[]).includes(userRole) ? [{
    key: 'createResults',
    header: 'Create Results',
    render: (value: any, row: any) => <Button size="sm" variant="outline" onClick={(e) => {
      e.stopPropagation();
      if (!currentInstituteId || !currentClassId || !currentSubjectId) {
        toast({
          title: "Missing Context",
          description: "Please select institute, class, and subject first",
          variant: "destructive"
        });
        return;
      }
      navigate(`/institute/${currentInstituteId}/class/${currentClassId}/subject/${currentSubjectId}/exam/${row.id}/create-results`);
    }} className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Create
        </Button>
  }] : []), {
    key: 'results',
    header: 'View Results',
    render: (value: any, row: any) => <Button size="sm" variant="default" onClick={(e) => {
      e.stopPropagation();
      handleViewResults(row);
    }} className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          View
        </Button>
  }];
  const canAdd = AccessControl.hasPermission(userRole, 'create-exam');
  const canEdit = userRole === 'Teacher' ? true : AccessControl.hasPermission(userRole, 'edit-exam');
  const canDelete = userRole === 'Teacher' ? true : AccessControl.hasPermission(userRole, 'delete-exam');
  const canView = true; // All users can view exams

  // DEBUG: Log role and institute information
  console.log('🔍 EXAMS DEBUG:', {
    userRole,
    selectedInstitute,
    'selectedInstitute.userRole': selectedInstitute?.userRole,
    'selectedInstitute.instituteUserType': (selectedInstitute as any)?.instituteUserType,
    canAdd,
    canEdit,
    canDelete,
    canView,
    handleEditExam: !!handleEditExam,
    handleViewResults: !!handleViewResults
  });
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
    let title = 'Exams';
    if (contexts.length > 0) {
      title += ` (${contexts.join(' → ')})`;
    }
    return title;
  };

  // Filter the exams based on local filters for mobile view
  const filteredExams = examsData.filter(exam => {
    const matchesSearch = !searchTerm || Object.values(exam).some(value => String(value).toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || exam.status === statusFilter;
    const matchesType = typeFilter === 'all' || exam.examType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });
  const shouldShowLoadButton = () => {
    if (userRole === 'Student') {
      return currentInstituteId && currentClassId && currentSubjectId;
    }
    if (userRole === 'InstituteAdmin' || userRole === 'Teacher') {
      return currentInstituteId;
    }
    return true;
  };
  const getLoadButtonMessage = () => {
    if (userRole === 'Student' && (!currentInstituteId || !currentClassId || !currentSubjectId)) {
      return 'Please select institute, class, and subject to view exams.';
    }
    if ((userRole === 'InstituteAdmin' || userRole === 'Teacher') && !currentInstituteId) {
      return 'Please select institute to view exams.';
    }
    return 'Click the button below to load exams data';
  };
  return <div className="container mx-auto p-6 space-y-6">
      {!hasAttemptedLoad ? <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {getTitle()}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Click the button below to load exams data
          </p>
          <Button onClick={() => handleLoadData(false)} disabled={isLoading || !shouldShowLoadButton()} className="bg-blue-600 hover:bg-blue-700">
            {isLoading ? <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Loading Data...
              </> : <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Load Data
              </>}
          </Button>
        </div> : <>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {getTitle()}
              </h1>
              {lastRefresh && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Last refreshed: {lastRefresh.toLocaleTimeString()}
                </p>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </Button>
              <Button onClick={handleRefreshData} disabled={isLoading} variant="outline" size="sm">
                {isLoading ? <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
                  </> : <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Data
                  </>}
              </Button>
            </div>
          </div>

          {/* Filter Controls */}
          {showFilters && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Search Exams
                </label>
                <Input placeholder="Search exams..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full" />
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
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Type
                </label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="physical">Physical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button variant="outline" onClick={() => {
            setSearchTerm('');
            setStatusFilter('all');
            setTypeFilter('all');
          }} className="w-full">
                  Clear Filters
                </Button>
              </div>
            </div>}

           {/* Add Create Buttons for InstituteAdmin and Teacher */}
           {(userRole === 'InstituteAdmin' || userRole === 'Teacher') && canAdd && <div className="flex justify-end gap-2 mb-4">
                
                <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Exam
                </Button>
              </div>}

           {/* MUI Table View - All Screen Sizes */}
          <MUITable title="" data={examsData} columns={examsColumns.map(col => ({
        id: col.key,
        label: col.header,
        minWidth: 170,
        format: col.render
      }))} onAdd={canAdd ? () => setIsCreateDialogOpen(true) : undefined} onEdit={userRole === 'InstituteAdmin' || userRole === 'Teacher' ? handleEditExam : undefined} onView={undefined} page={pagination.page} rowsPerPage={pagination.limit} totalCount={pagination.totalCount} onPageChange={setPage} onRowsPerPageChange={setLimit} rowsPerPageOptions={[25, 50, 100]} sectionType="exams" allowEdit={userRole === 'InstituteAdmin' || userRole === 'Teacher'} allowDelete={canDelete} />
        </>}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Exam</DialogTitle>
          </DialogHeader>
          <CreateExamForm onClose={() => setIsCreateDialogOpen(false)} onSuccess={handleCreateExam} />
        </DialogContent>
      </Dialog>

      {/* Update Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Exam</DialogTitle>
          </DialogHeader>
          {selectedExam && <UpdateExamForm exam={selectedExam} onClose={() => setIsUpdateDialogOpen(false)} onSuccess={handleUpdateExam} />}
        </DialogContent>
      </Dialog>

      {/* Create Results Dialog */}
      <Dialog open={isCreateResultsDialogOpen} onOpenChange={setIsCreateResultsDialogOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Results</DialogTitle>
          </DialogHeader>
          <CreateResultsForm onClose={() => setIsCreateResultsDialogOpen(false)} onSuccess={() => {
          setIsCreateResultsDialogOpen(false);
          toast({
            title: "Results Created",
            description: "Exam results have been created successfully."
          });
        }} />
        </DialogContent>
      </Dialog>

    </div>;
};
export default Exams;