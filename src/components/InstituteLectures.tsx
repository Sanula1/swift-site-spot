import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { lectureApi, Lecture } from '@/api/lecture.api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Video, Calendar, Clock, Users, MapPin, ExternalLink, Plus, Edit, Trash2, Play } from 'lucide-react';
import { format } from 'date-fns';
import CreateInstituteLectureForm from '@/components/forms/CreateInstituteLectureForm';
import UpdateInstituteLectureForm from '@/components/forms/UpdateInstituteLectureForm';
import DeleteLectureConfirmDialog from '@/components/forms/DeleteLectureConfirmDialog';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { useToast } from '@/hooks/use-toast';

const InstituteLectures = () => {
  const { selectedInstitute, user } = useAuth();
  const effectiveRole = useInstituteRole();
  const { toast } = useToast();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [lectureToDelete, setLectureToDelete] = useState<Lecture | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showRecordingDialog, setShowRecordingDialog] = useState(false);
  const [recordingLecture, setRecordingLecture] = useState<Lecture | null>(null);

  const fetchLectures = async (pageNum: number = 1, forceRefresh: boolean = false) => {
    if (!selectedInstitute?.id) {
      toast({
        title: 'Select Institute',
        description: 'Please select an institute first',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await lectureApi.getInstituteLectures({
        instituteId: selectedInstitute.id,
        page: pageNum,
        limit: 10,
        userId: user?.id,
        role: effectiveRole
      }, forceRefresh);

      console.log('Institute lectures response:', response);
      
      // Handle both direct array and wrapped response formats
      let lecturesData: Lecture[] = [];
      if (Array.isArray(response)) {
        lecturesData = response;
      } else if (response.data && Array.isArray(response.data)) {
        lecturesData = response.data;
      } else if (response && Array.isArray((response as any).lectures)) {
        lecturesData = (response as any).lectures;
      }

      setLectures(lecturesData);
      setTotalPages(Math.ceil(lecturesData.length / 10));
    } catch (error) {
      console.error('Error fetching institute lectures:', error);
      toast({
        title: 'Failed to load lectures',
        description: 'Failed to load institute lectures.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-load lectures when component mounts or institute changes
  useEffect(() => {
    if (selectedInstitute?.id) {
      fetchLectures(1);
    }
  }, [selectedInstitute?.id]);


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-gray-500 text-white dark:bg-gray-600';
      case 'live': return 'bg-green-500 text-white dark:bg-green-600';
      case 'completed': return 'bg-blue-500 text-white dark:bg-blue-600';
      case 'cancelled': return 'bg-red-500 text-white dark:bg-red-600';
      default: return 'bg-gray-500 text-white dark:bg-gray-600';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'online' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-foreground';
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled';
    return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
  };

  const handleJoinLecture = (lecture: Lecture) => {
    if (lecture.meetingLink) {
      window.open(lecture.meetingLink, '_blank');
    } else {
      toast({
        title: 'Meeting link not available',
        description: 'This lecture does not have a meeting link.',
        variant: 'destructive',
      });
    }
  };

  const handleViewRecording = (lecture: Lecture) => {
    if (lecture.recordingUrl) {
      setRecordingLecture(lecture);
      setShowRecordingDialog(true);
    } else {
      toast({
        title: 'Recording not available',
        description: 'This lecture does not have a recording.',
        variant: 'destructive',
      });
    }
  };

  const handleCreateSuccess = async () => {
    setShowCreateDialog(false);
    await fetchLectures(page);
  };

  const handleUpdateSuccess = async () => {
    setShowUpdateDialog(false);
    setSelectedLecture(null);
    await fetchLectures(page);
  };

  const handleUpdateClick = (lecture: Lecture) => {
    setSelectedLecture(lecture);
    setShowUpdateDialog(true);
  };

  const handleDeleteClick = (lecture: Lecture) => {
    setLectureToDelete(lecture);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!lectureToDelete) return;

    setIsDeleting(true);
    try {
      await lectureApi.deleteInstituteLecturePermanent(
        lectureToDelete.id,
        { instituteId: selectedInstitute?.id }
      );

      // Immediately remove from UI (optimistic update)
      setLectures(prevLectures => prevLectures.filter(l => l.id !== lectureToDelete.id));
      
      // Show success toast (bottom-right)
      toast({
        title: 'Delete Success',
        description: `${lectureToDelete.title} has been deleted successfully.`,
        variant: 'success',
      });
      
      // Close dialog and reset state
      setShowDeleteDialog(false);
      setLectureToDelete(null);
    } catch (error: any) {
      console.error('Error deleting lecture:', error);
      toast({
        title: 'Delete Failed',
        description: error?.response?.data?.message || 'Failed to delete lecture. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const isInstituteAdmin = effectiveRole === 'InstituteAdmin';

  if (!selectedInstitute) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Institute Lectures</h2>
          <p className="text-muted-foreground">Please select an institute to view lectures</p>
        </div>
      </div>
    );
  }

  // Check if user has permission to view institute lectures
  if (!effectiveRole || !['InstituteAdmin', 'Teacher', 'Student'].includes(effectiveRole)) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to view institute lectures</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Institute Lectures</h1>
          <p className="text-muted-foreground">
            View all lectures available in {selectedInstitute.name}
          </p>
        </div>
        <div className="flex gap-2">
          {isInstituteAdmin && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Lecture
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <CreateInstituteLectureForm
                  onClose={() => setShowCreateDialog(false)}
                  onSuccess={handleCreateSuccess}
                />
              </DialogContent>
            </Dialog>
          )}
          <Button onClick={() => fetchLectures(page, true)} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh Lectures'}
          </Button>
        </div>
      </div>

      {loading && lectures.length === 0 ? (
        <div className="text-center py-8">
          <p>Loading institute lectures...</p>
        </div>
      ) : lectures.length === 0 ? (
        <div className="text-center py-8">
          <Video className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Lectures Found</h3>
          <p className="text-muted-foreground">No institute lectures available at the moment</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {lectures.map((lecture) => (
              <Card key={lecture.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{lecture.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{lecture.description}</p>
                      {lecture.subject && (
                        <p className="text-sm font-medium text-primary">Subject: {lecture.subject}</p>
                      )}
                    </div>
                    <Badge className={getStatusColor(lecture.status)}>
                      {lecture.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>Start: {formatDateTime(lecture.startTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>End: {formatDateTime(lecture.endTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <span className={getTypeColor(lecture.lectureType)}>
                        Type: {lecture.lectureType === 'online' ? 'Online' : 'Physical'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>Max Participants: {lecture.maxParticipants}</span>
                    </div>
                    {lecture.venue && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>Venue: {lecture.venue}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    {lecture.status === 'scheduled' && lecture.meetingLink && (
                      <Button
                        size="sm"
                        onClick={() => handleJoinLecture(lecture)}
                        className="gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Join Lecture
                      </Button>
                    )}
                    {lecture.recordingUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewRecording(lecture)}
                        className="gap-2"
                      >
                        <Play className="h-4 w-4" />
                        View Recording
                      </Button>
                    )}
                    {isInstituteAdmin && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateClick(lecture)}
                          className="gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Update
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteClick(lecture)}
                          className="gap-2"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
              >
                Previous
              </Button>
              <span className="px-3 py-2 text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Update Dialog */}
      {selectedLecture && (
        <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <UpdateInstituteLectureForm
              lecture={selectedLecture}
              onClose={() => {
                setShowUpdateDialog(false);
                setSelectedLecture(null);
              }}
              onSuccess={handleUpdateSuccess}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteLectureConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        lectureTitle={lectureToDelete?.title || ''}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />

      {/* Recording Video Dialog */}
      <Dialog open={showRecordingDialog} onOpenChange={setShowRecordingDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0">
          <div className="relative bg-black rounded-lg overflow-hidden">
            {recordingLecture && (
              <>
                <div className="aspect-video w-full">
                  <iframe
                    src={recordingLecture.recordingUrl || ''}
                    className="w-full h-full"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    title={recordingLecture.title}
                  />
                </div>
                <div className="absolute top-4 left-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-4">
                  <h3 className="text-white font-semibold text-lg">{recordingLecture.title}</h3>
                  {recordingLecture.description && (
                    <p className="text-gray-300 text-sm mt-1">{recordingLecture.description}</p>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InstituteLectures;