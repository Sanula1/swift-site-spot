import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { AccessControl, UserRole } from '@/utils/permissions';
import { homeworkSubmissionsApi, type HomeworkSubmission } from '@/api/homeworkSubmissions.api';
import { FileText, Calendar, User, ExternalLink, RefreshCw, Lock } from 'lucide-react';
import { PDFViewer } from '@/components/ui/pdf-viewer';

interface HomeworkSubmissionsDialogProps {
  homework: any;
  isOpen: boolean;
  onClose: () => void;
}

const HomeworkSubmissionsDialog = ({ homework, isOpen, onClose }: HomeworkSubmissionsDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const userRole = useInstituteRole();
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState('');
  const [selectedPdfTitle, setSelectedPdfTitle] = useState('');

  const loadSubmissions = async () => {
    if (!homework?.id) return;

    setIsLoading(true);
    try {
      const response = await homeworkSubmissionsApi.getSubmissions({
        homeworkId: homework.id,
        page: 1,
        limit: 50,
        userId: user?.id,
        role: userRole,
        instituteId: homework.instituteId,
        classId: homework.classId,
        subjectId: homework.subjectId
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
    if (isOpen && homework?.id) {
      loadSubmissions();
    }
  }, [isOpen, homework?.id]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if user has permission to view homework submissions
  if (!AccessControl.hasPermission(userRole, 'view-homework-submissions')) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Access Denied
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <p className="text-muted-foreground mb-4">
              You don't have permission to view homework submissions. Only teachers and institute administrators can access this feature.
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Homework Submissions: {homework?.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Homework Info */}
          <div className="bg-muted/50 p-4 rounded-lg border">
            <h3 className="font-semibold mb-2">{homework?.title}</h3>
            <p className="text-muted-foreground mb-2">{homework?.description}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {homework?.startDate && (
                <span>Start: {new Date(homework.startDate).toLocaleDateString()}</span>
              )}
              {homework?.endDate && (
                <span>Due: {new Date(homework.endDate).toLocaleDateString()}</span>
              )}
            </div>
          </div>

          {/* Refresh Button */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">
              Submissions ({submissions.length})
            </h3>
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

          {/* Submissions List */}
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
            <div className="space-y-4">
              {submissions.map((submission) => (
                <div key={submission.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span className="font-medium">
                          {submission.student?.firstName} {submission.student?.lastName}
                        </span>
                        <Badge variant={submission.isActive ? 'default' : 'secondary'}>
                          {submission.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Submitted: {formatDate(submission.submissionDate)}
                      </div>
                    </div>
                  </div>

                  {submission.remarks && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Student Notes:</h4>
                      <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                        {submission.remarks}
                      </p>
                    </div>
                  )}

                  {submission.fileUrl && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Submitted File:</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPdfUrl(submission.fileUrl || '');
                          setSelectedPdfTitle('Student Submission');
                          setPdfModalOpen(true);
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View File
                      </Button>
                    </div>
                  )}

                  {submission.teacherCorrectionFileUrl && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Teacher Correction:</h4>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedPdfUrl(submission.teacherCorrectionFileUrl || '');
                          setSelectedPdfTitle('Teacher Correction');
                          setPdfModalOpen(true);
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View Correction
                      </Button>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground pt-2 border-t">
                    Created: {formatDate(submission.createdAt)}
                    {submission.updatedAt !== submission.createdAt && (
                      <> • Updated: {formatDate(submission.updatedAt)}</>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
      
      {/* PDF Viewer Modal */}
      <Dialog open={pdfModalOpen} onOpenChange={setPdfModalOpen}>
        <DialogContent className="max-w-5xl h-[90vh]">
          <DialogHeader>
            <DialogTitle>{selectedPdfTitle}</DialogTitle>
          </DialogHeader>
          <div className="w-full h-[calc(90vh-80px)]">
            {selectedPdfUrl && <PDFViewer url={selectedPdfUrl} title={selectedPdfTitle} />}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default HomeworkSubmissionsDialog;