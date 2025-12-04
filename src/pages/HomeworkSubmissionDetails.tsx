import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { AccessControl, UserRole } from '@/utils/permissions';
import { homeworkSubmissionsApi, type HomeworkSubmission } from '@/api/homeworkSubmissions.api';
import { homeworkApi, type Homework } from '@/api/homework.api';
import { FileText, Calendar, User, ExternalLink, RefreshCw, ArrowLeft, Lock, Edit } from 'lucide-react';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import AppLayout from '@/components/layout/AppLayout';
import UploadCorrectionDialog from '@/components/forms/UploadCorrectionDialog';
import MUITable from '@/components/ui/mui-table';

const HomeworkSubmissionDetails = () => {
  const { instituteId, classId, subjectId, homeworkId } = useParams<{ 
    instituteId: string; 
    classId: string; 
    subjectId: string; 
    homeworkId: string 
  }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const instituteRole = useInstituteRole();
  const [homework, setHomework] = useState<Homework | null>(null);
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHomework, setIsLoadingHomework] = useState(false);
  const [correctionDialogOpen, setCorrectionDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<HomeworkSubmission | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewSubmission, setViewSubmission] = useState<HomeworkSubmission | null>(null);

  const loadHomework = async () => {
    if (!homeworkId) return;

    setIsLoadingHomework(true);
    try {
      const response = await homeworkApi.getHomeworkById(homeworkId);
      setHomework(response);
    } catch (error) {
      console.error('Error loading homework:', error);
      toast({
        title: "Error",
        description: "Failed to load homework details",
        variant: "destructive"
      });
    } finally {
      setIsLoadingHomework(false);
    }
  };

  const loadSubmissions = async () => {
    if (!homeworkId) return;

    setIsLoading(true);
    try {
      const response = await homeworkSubmissionsApi.getSubmissions({
        homeworkId: homeworkId,
        page: 1,
        limit: 50,
      }, true);

      const submissionsList = Array.isArray(response) ? response : response.data || [];
      setSubmissions(submissionsList);
    } catch (error) {
      console.error('Error loading submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load homework submissions",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (homeworkId) {
      loadHomework();
      loadSubmissions();
    }
  }, [homeworkId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleCorrectionClick = (submission: HomeworkSubmission) => {
    setSelectedSubmission(submission);
    setCorrectionDialogOpen(true);
  };

  const handleCorrectionSuccess = () => {
    loadSubmissions(); // Refresh submissions to show the new correction file
  };

  // Check if user can upload corrections (InstituteAdmin or Teacher only)
  const canUploadCorrections = ['InstituteAdmin', 'Teacher'].includes(instituteRole);

  const handleViewDetails = (submission: HomeworkSubmission) => {
    setViewSubmission(submission);
    setViewDialogOpen(true);
  };

  // MUI table columns for submissions
  const submissionColumns: {
    id: string;
    label: string;
    minWidth?: number;
    align?: 'right' | 'left' | 'center';
    format?: (value: any, row?: any) => React.ReactNode;
  }[] = [
    {
      id: 'studentId',
      label: 'Student ID',
      minWidth: 120,
      format: (val) => val || '-',
    },
    {
      id: 'submissionDate',
      label: 'Submission Date',
      minWidth: 170,
      format: (val) => formatDate(val),
    },
    {
      id: 'fileUrl',
      label: 'File URL',
      minWidth: 150,
      format: (val) => val ? (
        <Button 
          size="sm" 
          className="bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => window.open(val, '_blank')}
        >
          HW File
        </Button>
      ) : '-',
    },
    {
      id: 'teacherCorrectionFileUrl',
      label: 'Correction URL',
      minWidth: 150,
      format: (val) => val ? (
        <Button 
          size="sm" 
          className="bg-yellow-600 hover:bg-yellow-700 text-white"
          onClick={() => window.open(val, '_blank')}
        >
          Correction File
        </Button>
      ) : '-',
    },
    {
      id: 'remarks',
      label: 'Remarks',
      minWidth: 220,
      format: (val) => val ? <span className="line-clamp-2">{val}</span> : '-',
    },
    {
      id: 'isActive',
      label: 'Status',
      minWidth: 100,
      format: (val) => (
        <Badge variant={val ? 'default' : 'secondary'}>
          {val ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
  ];

  // Check if user has permission to view homework submissions (institute-specific)
  if (!AccessControl.hasPermission(instituteRole as UserRole, 'view-homework-submissions')) {
    return (
      <AppLayout>
        <div className="container mx-auto py-8">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Access Denied
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                You don't have permission to view homework submissions. Only teachers and institute administrators can access this feature.
              </p>
              <Button onClick={() => navigate('/homework')}>
                Back to Homework
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (isLoadingHomework) {
    return (
      <AppLayout>
        <div className="container mx-auto py-8">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading homework details...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!homework) {
    return (
      <AppLayout>
        <div className="container mx-auto py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Homework Not Found</h3>
              <p className="text-muted-foreground mb-4">The homework assignment could not be found.</p>
              <Button onClick={() => navigate('/homework')}>
                Back to Homework
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/institute/${instituteId}/class/${classId}/subject/${subjectId}/homework`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Homework
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            <h1 className="text-2xl font-bold">Homework Submissions</h1>
          </div>
        </div>

        {/* Homework Info */}
        <Card>
          <CardHeader>
            <CardTitle>{homework.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{homework.description}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {homework.startDate && (
                <span>Start: {new Date(homework.startDate).toLocaleDateString()}</span>
              )}
              {homework.endDate && (
                <span>Due: {new Date(homework.endDate).toLocaleDateString()}</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submissions Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>
                Submissions ({submissions.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadSubmissions}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Loading submissions...</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Submissions Yet</h3>
                <p className="text-muted-foreground">No students have submitted this homework yet.</p>
              </div>
            ) : (
              <MUITable
                title="Homework Submissions"
                columns={submissionColumns}
                data={submissions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)}
                page={page}
                rowsPerPage={rowsPerPage}
                totalCount={submissions.length}
                onPageChange={(newPage) => setPage(newPage)}
                onRowsPerPageChange={(newRows) => { setRowsPerPage(newRows); setPage(0); }}
                rowsPerPageOptions={[10, 25, 50, 100]}
                sectionType="homework"
                onView={(row: HomeworkSubmission) => handleViewDetails(row)}
                customActions={
                  canUploadCorrections
                    ? [{
                        label: 'Correction',
                        action: (row: HomeworkSubmission) => handleCorrectionClick(row),
                        icon: <Edit className="h-3 w-3" />,
                        variant: 'outline' as const,
                        className: 'border-red-600 text-red-600 hover:bg-red-600 hover:text-white',
                      }]
                    : []
                }
              />
            )}
          </CardContent>
        </Card>

        {/* View Details Dialog */}
        {viewSubmission && (
          <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Submission Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Submission ID</label>
                    <p className="mt-1">{viewSubmission.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Student ID</label>
                    <p className="mt-1">{viewSubmission.studentId}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Student Name</label>
                    <p className="mt-1">{viewSubmission.student?.firstName} {viewSubmission.student?.lastName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Status</label>
                    <p className="mt-1">
                      <Badge variant={viewSubmission.isActive ? 'default' : 'secondary'}>
                        {viewSubmission.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Submission Date</label>
                    <p className="mt-1">{formatDate(viewSubmission.submissionDate)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created At</label>
                    <p className="mt-1">{formatDate(viewSubmission.createdAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Updated At</label>
                    <p className="mt-1">{formatDate(viewSubmission.updatedAt)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Homework ID</label>
                    <p className="mt-1">{viewSubmission.homeworkId}</p>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Remarks</label>
                  <p className="mt-1 p-3 bg-muted/50 rounded-md">{viewSubmission.remarks || 'No remarks'}</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Correction Upload Dialog */}
        {selectedSubmission && (
          <UploadCorrectionDialog
            submissionId={selectedSubmission.id}
            studentName={`${selectedSubmission.student?.firstName} ${selectedSubmission.student?.lastName}`}
            submission={selectedSubmission}
            isOpen={correctionDialogOpen}
            onClose={() => setCorrectionDialogOpen(false)}
            onSuccess={handleCorrectionSuccess}
          />
        )}
      </div>
    </AppLayout>
  );
};

export default HomeworkSubmissionDetails;