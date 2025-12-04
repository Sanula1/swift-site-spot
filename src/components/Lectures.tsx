import React, { useState, useMemo } from 'react';
import MUITable from '@/components/ui/mui-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Filter, Plus, Calendar, Clock, MapPin, Video, Users, ExternalLink, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type UserRole } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { AccessControl } from '@/utils/permissions';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import CreateLectureForm from '@/components/forms/CreateLectureForm';
import UpdateLectureForm from '@/components/forms/UpdateLectureForm';
import { DataCardView } from '@/components/ui/data-card-view';
import { useTableData } from '@/hooks/useTableData';
import { cachedApiClient } from '@/api/cachedClient';
import VideoPreviewDialog from '@/components/VideoPreviewDialog';

interface LecturesProps {
  apiLevel?: 'institute' | 'class' | 'subject';
}

const Lectures = ({ apiLevel = 'institute' }: LecturesProps) => {
  const navigate = useNavigate();
  const { user, selectedInstitute, selectedClass, selectedSubject, currentInstituteId, currentClassId, currentSubjectId } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedLectureData, setSelectedLectureData] = useState<any>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoPreviewTitle, setVideoPreviewTitle] = useState<string>('');

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const userRole = useInstituteRole();
  
  // Memoize endpoint to prevent unnecessary re-renders
  const endpoint = useMemo(() => {
    if (userRole === 'Student') {
      return '/institute-class-subject-lectures';
    } else if (userRole === 'InstituteAdmin' || userRole === 'Teacher') {
      if (currentInstituteId && currentClassId && currentSubjectId) {
        return '/institute-class-subject-lectures';
      }
    }
    return '/lectures';
  }, [userRole, currentInstituteId, currentClassId, currentSubjectId]);

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
      params.instructorId = user.id;
    }
    
    return params;
  }, [currentInstituteId, currentClassId, currentSubjectId, userRole, user?.id]);
  
  // Enhanced pagination with useTableData hook - AUTO-LOAD when subject selected
  const tableData = useTableData({
    endpoint,
    defaultParams,
    dependencies: [currentInstituteId, currentClassId, currentSubjectId], // Auto-reload on context changes
    pagination: {
      defaultLimit: 50,
      availableLimits: [25, 50, 100]
    },
    autoLoad: true // Enable auto-loading from cache
  });

  const { 
    state: { data: lecturesData, loading: isLoading },
    pagination,
    actions
  } = tableData;

  // Track if we've attempted to load data at least once
  const [hasAttemptedLoad, setHasAttemptedLoad] = React.useState(false);

  const handleLoadData = async (forceRefresh = false) => {
    if (userRole === 'Student') {
      if (!currentInstituteId || !currentClassId || !currentSubjectId) {
        toast({
          title: "Missing Selection",
          description: "Please select institute, class, and subject to view lectures.",
          variant: "destructive"
        });
        return;
      }
    } else if (userRole === 'InstituteAdmin' || userRole === 'Teacher') {
      if (!currentInstituteId || !currentClassId || !currentSubjectId) {
        toast({
          title: "Missing Selection",
          description: "Please select institute, class, and subject to view lectures.",
          variant: "destructive"
        });
        return;
      }
    }

    setHasAttemptedLoad(true);
    
    // Update filters and load data
    actions.updateFilters(defaultParams);
    
    // Always trigger data loading
    actions.loadData(forceRefresh);
  };

  const handleRefreshData = async () => {
    console.log('Force refreshing lectures data...');
    actions.refresh();
    setLastRefresh(new Date());
  };

  const handleCreateLecture = async () => {
    setIsCreateDialogOpen(false);
    // Force refresh after creating new lecture
    actions.refresh();
  };

  const handleEditLecture = async (lectureData: any) => {
    console.log('Opening update lecture dialog:', lectureData);
    setSelectedLectureData(lectureData);
    setIsEditDialogOpen(true);
  };

  const handleUpdateLecture = async () => {
    setIsEditDialogOpen(false);
    setSelectedLectureData(null);
    // Force refresh after updating lecture
    actions.refresh();
  };


  const handleDeleteLecture = async (lectureData: any) => {
    console.log('Deleting lecture:', lectureData);
    
    try {
      // Use cached client for delete (will clear related cache)
      await cachedApiClient.delete(`/lectures/${lectureData.id}`);

      console.log('Lecture deleted successfully');
      
      toast({
        title: "Lecture Deleted",
        description: `Lecture ${lectureData.title} has been deleted successfully.`,
        variant: "destructive"
      });
      
      // Force refresh after deletion
      actions.refresh();
      
    } catch (error) {
      console.error('Error deleting lecture:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete lecture. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleViewLecture = (lectureData: any) => {
    console.log('View lecture:', lectureData);
    toast({
      title: "Lecture Viewed",
      description: `Viewing lecture: ${lectureData.title}`
    });
  };


  const lecturesColumns = [
    { key: 'title', header: 'Title' },
    { key: 'description', header: 'Description' },
    { key: 'lectureType', header: 'Type', render: (value: string) => <Badge variant="outline">{value}</Badge> },
    { key: 'venue', header: 'Venue' },
    { key: 'startTime', header: 'Start Time', render: (value: string) => new Date(value).toLocaleString() },
    { key: 'endTime', header: 'End Time', render: (value: string) => new Date(value).toLocaleString() },
    { 
      key: 'status', 
      header: 'Status',
      render: (value: string) => (
        <Badge variant={value === 'scheduled' ? 'default' : value === 'completed' ? 'secondary' : 'destructive'}>
          {value}
        </Badge>
      )
    },
    ...((['InstituteAdmin', 'Teacher', 'Student'] as UserRole[]).includes(userRole) ? [{
      key: 'meetingLink',
      header: 'Join Lecture',
      render: (value: string, row: any) => value ? (
        <Button
          size="sm"
          variant="default"
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={() => window.open(value, '_blank')}
        >
          <ExternalLink className="h-3 w-3 mr-1" />
          Join
        </Button>
      ) : (
        <span className="text-gray-400">No link</span>
      )
    }, {
      key: 'recordingUrl',
      header: 'Recording',
      render: (value: string, row: any) => {
        const recUrl = value || row.recordingUrl || row.recording_url || row.recUrl || row.videoUrl || row.video_url;
        
        const isYouTubeOrDrive = (url: string) => {
          return url.includes('youtube.com') || 
                 url.includes('youtu.be') || 
                 url.includes('drive.google.com');
        };
        
        const handleRecordingClick = (url: string) => {
          if (isYouTubeOrDrive(url)) {
            setVideoPreviewUrl(url);
            setVideoPreviewTitle(row.title || 'Lecture Recording');
          } else {
            window.open(url, '_blank');
          }
        };
        
        return recUrl ? (
          <Button
            size="sm"
            variant="default"
            className="hover:opacity-90"
            onClick={() => handleRecordingClick(recUrl)}
          >
            <Video className="h-3 w-3 mr-1" />
            View Rec
          </Button>
        ) : (
          <span className="text-gray-400">No recording</span>
        );
      }
    }] : [])
  ];

  const canAdd = AccessControl.hasPermission(userRole, 'create-lecture');
  const canEdit = userRole === 'Teacher' ? true : AccessControl.hasPermission(userRole, 'edit-lecture');
  const canDelete = userRole === 'Teacher' ? true : AccessControl.hasPermission(userRole, 'delete-lecture');

  // DEBUG: Log role and institute information
  console.log('🔍 LECTURES DEBUG:', {
    userRole,
    selectedInstitute,
    'selectedInstitute.userRole': selectedInstitute?.userRole,
    'selectedInstitute.instituteUserType': (selectedInstitute as any)?.instituteUserType,
    canEdit,
    canDelete,
    canAdd
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
    
    let title = 'Lectures';
    if (contexts.length > 0) {
      title += ` (${contexts.join(' → ')})`;
    }
    
    return title;
  };

  // Filter the lectures based on local filters for mobile view
  const filteredLectures = lecturesData.filter(lecture => {
    const matchesSearch = !searchTerm || 
      Object.values(lecture).some(value => 
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    const matchesStatus = statusFilter === 'all' || 
      lecture.status === statusFilter;
    
    const matchesType = typeFilter === 'all' || 
      lecture.lectureType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      {!hasAttemptedLoad ? (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {getTitle()}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {userRole === 'Student' && (!currentInstituteId || !currentClassId || !currentSubjectId)
              ? 'Please select institute, class, and subject to view lectures.'
              : 'Click the button below to load lectures data'
            }
          </p>
          <Button 
            onClick={() => handleLoadData(false)} 
            disabled={isLoading || (userRole === 'Student' && (!currentInstituteId || !currentClassId || !currentSubjectId))}
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
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
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
                  Search Lectures
                </label>
                <Input
                  placeholder="Search lectures..."
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
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="ongoing">Ongoing</SelectItem>
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
                    <SelectItem value="physical">Physical</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setTypeFilter('all');
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          )}

          {/* Add Create Button for InstituteAdmin and Teacher */}
          {['InstituteAdmin', 'Teacher'].includes(userRole) && canAdd && (
            <div className="flex justify-end mb-4">
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Create Lecture
              </Button>
            </div>
          )}

           {/* MUI Table View - All Screen Sizes */}
          <MUITable
            title=""
            data={lecturesData}
            columns={lecturesColumns.map(col => ({
              id: col.key,
              label: col.header,
              minWidth: 170,
              format: col.render
            }))}
            onAdd={canAdd ? () => setIsCreateDialogOpen(true) : undefined}
            onEdit={(userRole === 'InstituteAdmin' || userRole === 'Teacher') ? handleEditLecture : undefined}
            onDelete={canDelete ? handleDeleteLecture : undefined}
            page={pagination.page}
            rowsPerPage={pagination.limit}
            totalCount={pagination.totalCount}
            onPageChange={(newPage: number) => actions.setPage(newPage)}
            onRowsPerPageChange={(newLimit: number) => actions.setLimit(newLimit)}
            sectionType="lectures"
            allowEdit={userRole === 'InstituteAdmin' || userRole === 'Teacher'}
            allowDelete={canDelete}
          />
        </>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Lecture</DialogTitle>
          </DialogHeader>
          <CreateLectureForm
            onClose={() => setIsCreateDialogOpen(false)}
            onSuccess={handleCreateLecture}
          />
        </DialogContent>
      </Dialog>

      {/* Update Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Lecture</DialogTitle>
          </DialogHeader>
          {selectedLectureData && (
            <UpdateLectureForm
              lecture={selectedLectureData}
              onClose={() => setIsEditDialogOpen(false)}
              onSuccess={handleUpdateLecture}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Video Preview Dialog */}
      <VideoPreviewDialog
        open={!!videoPreviewUrl}
        onOpenChange={(open) => !open && setVideoPreviewUrl(null)}
        url={videoPreviewUrl || ''}
        title={videoPreviewTitle}
      />

    </div>
  );
};

export default Lectures;
