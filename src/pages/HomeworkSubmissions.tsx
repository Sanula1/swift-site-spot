import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { homeworkSubmissionsApi, type HomeworkSubmission } from '@/api/homeworkSubmissions.api';
import { instituteStudentsApi } from '@/api/instituteStudents.api';
import { AccessControl, UserRole } from '@/utils/permissions';
import { FileText, Calendar, ExternalLink, RefreshCw, ArrowLeft, BookOpen, School, Users, Lock, Edit, Eye } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getImageUrl } from '@/utils/imageUrlHelper';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import UploadCorrectionDialog from '@/components/forms/UploadCorrectionDialog';
import ImagePreviewModal from '@/components/ImagePreviewModal';

const HomeworkSubmissions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    toast
  } = useToast();
  const {
    user,
    selectedInstitute,
    selectedClass,
    selectedSubject,
    currentInstituteId,
    currentClassId,
    currentSubjectId
  } = useAuth();

  // This component is rendered without a <Route> wrapper, so useParams() isn't reliable here.
  // Extract homeworkId from the URL: /institute/:instituteId/class/:classId/subject/:subjectId/homework/:homeworkId/submissions
  const homeworkIdFromPath = React.useMemo(() => {
    const match = location.pathname.match(/\/homework\/([^\/]+)\/submissions/);
    return match?.[1];
  }, [location.pathname]);

  const instituteRole = useInstituteRole();
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const itemsPerPage = 10;

  // Track current context to prevent unnecessary reloads
  const contextKey = `${currentInstituteId}-${currentClassId}-${currentSubjectId}`;
  const [lastLoadedContext, setLastLoadedContext] = useState<string>('');

  // State for upload correction dialog
  const [selectedSubmission, setSelectedSubmission] = useState<HomeworkSubmission | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);

  // State for image preview modal
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewImageTitle, setPreviewImageTitle] = useState<string>('');

  // studentId -> imageUrl map (submissions API often returns studentImageUrl = null)
  const [studentImageById, setStudentImageById] = useState<Record<string, string>>({});

  // Check if user can edit (Teacher or InstituteAdmin)
  const canEdit = instituteRole === 'Teacher' || instituteRole === 'InstituteAdmin';

  const handleImageClick = (resolvedImageUrl: string, studentName: string) => {
    if (!resolvedImageUrl) return;
    setPreviewImageUrl(resolvedImageUrl);
    setPreviewImageTitle(`${studentName}'s Photo`);
  };

  const getStudentName = (submission: HomeworkSubmission) => {
    const nameFromApi = submission.studentName?.trim();
    if (nameFromApi) return nameFromApi;

    const nameFromStudent = [submission.student?.firstName, submission.student?.lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    return nameFromStudent || 'Student';
  };

  const getStudentEmail = (submission: HomeworkSubmission) => {
    return submission.studentEmail?.trim() || submission.student?.email || 'No email';
  };

  const getStudentResolvedImageUrl = (submission: HomeworkSubmission) => {
    // Prefer non-empty image URL from submissions, otherwise fall back to the student list lookup
    const rawUrl = submission.studentImageUrl || studentImageById[submission.studentId];
    return getImageUrl(rawUrl);
  };

  const loadStudentImagesForSubmissions = async (submissionsList: HomeworkSubmission[]) => {
    const uniqueStudentIds = Array.from(new Set(submissionsList.map(s => s.studentId).filter(Boolean)));
    if (!uniqueStudentIds.length) return;
    if (!currentInstituteId || !currentClassId) return;

    // The submissions API often returns studentImageUrl = null; fetch students by CLASS so we also cover
    // students who submitted but aren't returned in the subject-based student list.
    const remainingIds = new Set(uniqueStudentIds);

    try {
      const map: Record<string, string> = {};
      const maxPages = 10;

      for (let page = 1; page <= maxPages && remainingIds.size > 0; page++) {
        const res = await instituteStudentsApi.getStudentsByClass(String(currentInstituteId), String(currentClassId), {
          page,
          limit: 50
        });

        for (const student of res.data || []) {
          // Mark as found (so we don't keep paging forever when a student has no image)
          remainingIds.delete(student.id);
          if (student.studentId) remainingIds.delete(student.studentId);

          if (student.imageUrl) {
            map[student.id] = student.imageUrl;
            if (student.studentId) map[student.studentId] = student.imageUrl;
          }
        }

        if (!res.meta?.totalPages || page >= res.meta.totalPages) break;
      }

      setStudentImageById(map);
    } catch (e) {
      console.warn('Failed to load student images for submissions', e);
    }
  };

  const loadSubmissions = async (page = 1) => {
    if (!homeworkIdFromPath) {
      toast({
        title: 'Missing Homework',
        description: 'Homework ID not found in the URL.',
        variant: 'destructive'
      });
      return;
    }

    console.log('🔄 Loading homework submissions for homework:', {
      homeworkId: homeworkIdFromPath,
      page,
      limit: itemsPerPage,
      userId: user?.id
    });

    setIsLoading(true);
    try {
      const response = await homeworkSubmissionsApi.getSubmissions(
        {
          page,
          limit: itemsPerPage,
          homeworkId: homeworkIdFromPath
        },
        true
      );

      const submissionsList = Array.isArray(response) ? response : response.data || [];
      const meta = Array.isArray(response)
        ? { total: submissionsList.length }
        : response.meta || { total: submissionsList.length };

      setSubmissions(submissionsList);
      void loadStudentImagesForSubmissions(submissionsList);
      setTotalSubmissions(meta.total || submissionsList.length);
      setCurrentPage(page);
      setLastRefresh(new Date());

      toast({
        title: submissionsList.length > 0 ? 'Submissions Loaded' : 'No Submissions',
        description: submissionsList.length > 0
          ? `Found ${submissionsList.length} homework submissions`
          : 'No submissions found for this homework.',
        variant: submissionsList.length > 0 ? 'default' : 'destructive'
      });
    } catch (error) {
      console.error('❌ Error loading submissions:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load homework submissions',
        variant: 'destructive'
      });

      setSubmissions([]);
      setTotalSubmissions(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (homeworkIdFromPath && contextKey !== lastLoadedContext) {
      setLastLoadedContext(contextKey);
      void loadSubmissions(1);
    }
  }, [contextKey, homeworkIdFromPath]);

  const formatDate = (dateString: string | Date | any) => {
    try {
      // Handle empty objects or invalid dates
      if (!dateString || typeof dateString === 'object' && Object.keys(dateString).length === 0) {
        return 'Not submitted';
      }
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };
  const handleGoBack = () => {
    navigate('/homework');
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
    return contexts.join(' → ');
  };

  // Check if user has permission to view homework submissions (institute-specific)
  if (!AccessControl.hasPermission(instituteRole as UserRole, 'view-homework-submissions')) {
    return <div className="container mx-auto p-6">
        <Card>
          <CardContent className="text-center py-12">
            <Lock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Access Denied</h3>
            <p className="text-muted-foreground mb-4">
              You don't have permission to view homework submissions. Only teachers and institute administrators can access this feature.
            </p>
            <Button onClick={() => navigate('/homework')}>
              Back to Homework
            </Button>
          </CardContent>
        </Card>
      </div>;
  }
  return <>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={handleGoBack} className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Homework
          </Button>
          
        </div>

        {/* Context Info Card */}
        {selectedInstitute && selectedClass && selectedSubject && <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Current Context
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <School className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Institute</p>
                    <p className="font-medium">{selectedInstitute.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Class</p>
                    <p className="font-medium">{selectedClass.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Subject</p>
                    <p className="font-medium">{selectedSubject.name}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>}

        {/* Actions */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            All Submissions ({submissions.length})
          </h2>
          <div className="flex gap-2">
            <Button variant="default" onClick={() => loadSubmissions(1)} disabled={isLoading}>
              {isLoading ? <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </> : <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Load Data
                </>}
            </Button>
            <Button variant="outline" onClick={() => loadSubmissions(currentPage)} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Check for missing homework id */}
        {!homeworkIdFromPath ? <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Missing Homework</h3>
              <p className="text-muted-foreground mb-4">
                Homework ID not found in the URL.
              </p>
              <Button onClick={() => navigate('/homework')}>
                Go to Homework
              </Button>
            </CardContent>
          </Card> : isLoading ? <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading submissions...</p>
          </div> : <div className="space-y-4">
            {/* Debug Info - Remove this after fixing */}
            

            {submissions.length === 0 ? <Card>
                <CardContent className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Submissions Found</h3>
                  <p className="text-muted-foreground mb-4">
                    No homework submissions found for this homework.
                  </p>
                  <Button onClick={() => loadSubmissions(1)} variant="outline">
                    Refresh Data
                  </Button>
                </CardContent>
              </Card> : <>
                {/* Student Submissions Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Student Submissions ({submissions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0" style={{ height: 'calc(100vh - 400px)', minHeight: '400px' }}>
                    <div className="overflow-auto h-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">ID</TableHead>
                        <TableHead>Student Details</TableHead>
                        <TableHead>Homework Assignment</TableHead>
                        <TableHead>Submission Date</TableHead>
                        <TableHead>File Status</TableHead>
                        <TableHead>Teacher Feedback</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissions.map((submission, index) => <TableRow key={submission.id} className="hover:bg-muted/50">
                          <TableCell className="font-mono text-sm">
                            #{(currentPage - 1) * itemsPerPage + index + 1}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const studentName = getStudentName(submission);
                              const studentEmail = getStudentEmail(submission);
                              const studentImageUrl = getStudentResolvedImageUrl(submission);
                              const isClickable = Boolean(studentImageUrl);

                              return (
                                <div className="flex items-center gap-3">
                                  <Avatar
                                    className={`h-10 w-10 ${isClickable ? 'cursor-pointer hover:ring-2 hover:ring-primary transition-all' : ''}`}
                                    onClick={() => isClickable && handleImageClick(studentImageUrl, studentName)}
                                  >
                                    {studentImageUrl ? (
                                      <AvatarImage src={studentImageUrl} alt={studentName} />
                                    ) : null}
                                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                      {studentName.charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <div className="font-medium text-sm truncate">{studentName}</div>
                                    <div className="text-xs text-muted-foreground truncate">{studentEmail}</div>
                                  </div>
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm">
                              {submission.homework?.title || 'Unknown Assignment'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>{formatDate(submission.submissionDate)}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              {submission.fileUrl ? <div className="flex items-center gap-2 text-sm text-green-600">
                                  <FileText className="h-4 w-4" />
                                  <span>Submitted</span>
                                </div> : <div className="flex items-center gap-2 text-sm text-red-500">
                                  <FileText className="h-4 w-4" />
                                  <span>No File</span>
                                </div>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              {submission.teacherCorrectionFileUrl ? <div className="flex items-center gap-2 text-sm text-blue-600">
                                  <FileText className="h-4 w-4" />
                                  <span>Corrected</span>
                                </div> : <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <FileText className="h-4 w-4" />
                                    <span>Pending</span>
                                  </div>
                                  {canEdit && <Button size="default" variant="destructive" onClick={() => {
                              console.log('Setting selected submission:', submission);
                              setSelectedSubmission(submission);
                              setIsUploadDialogOpen(true);
                            }}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Upload Correction
                                    </Button>}
                                </div>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Eye className="h-4 w-4 mr-1" />
                                  View
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-80">
                                <div className="space-y-3">
                                  <h4 className="font-semibold text-sm">Submission Details</h4>
                                  <div className="space-y-3 text-sm">
                                    <div className="flex items-center gap-3 pb-2 border-b">
                                      {(() => {
                                        const studentName = getStudentName(submission);
                                        const studentEmail = getStudentEmail(submission);
                                        const studentImageUrl = getStudentResolvedImageUrl(submission);

                                        return (
                                          <>
                                            <Avatar className="h-10 w-10">
                                              {studentImageUrl ? (
                                                <AvatarImage src={studentImageUrl} alt={studentName} />
                                              ) : null}
                                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                                {studentName.charAt(0).toUpperCase()}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                              <div className="font-medium truncate">{studentName}</div>
                                              <div className="text-xs text-muted-foreground truncate">{studentEmail}</div>
                                            </div>
                                          </>
                                        );
                                      })()}
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Homework: </span>
                                      <span className="font-medium">{submission.homework?.title || 'Unknown'}</span>
                                    </div>
                                    {submission.homework?.description && <div>
                                        <span className="text-muted-foreground">Description: </span>
                                        <span>{submission.homework.description}</span>
                                      </div>}
                                    <div>
                                      <span className="text-muted-foreground">Submitted: </span>
                                      <span>{formatDate(submission.submissionDate)}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Status: </span>
                                      <span>{submission.isActive ? 'Active' : 'Inactive'}</span>
                                    </div>
                                    {submission.remarks && <div>
                                        <span className="text-muted-foreground">Teacher Notes: </span>
                                        <span>{submission.remarks}</span>
                                      </div>}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end flex-wrap">
                              {submission.fileUrl && <Button size="sm" variant="outline" onClick={() => window.open(submission.fileUrl, '_blank')}>
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View Submission
                                </Button>}
                              {submission.teacherCorrectionFileUrl && <Button size="sm" variant="outline" onClick={() => window.open(submission.teacherCorrectionFileUrl, '_blank')} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View Correction
                                </Button>}
                            </div>
                          </TableCell>
                        </TableRow>)}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Pagination */}
            {Math.ceil(totalSubmissions / itemsPerPage) > 1 && <div className="flex justify-center">
                <Pagination>
                  <PaginationContent>
                    {currentPage > 1 && <PaginationItem>
                        <PaginationPrevious onClick={() => loadSubmissions(currentPage - 1)} className="cursor-pointer" />
                      </PaginationItem>}
                    
                    {Array.from({
                  length: Math.ceil(totalSubmissions / itemsPerPage)
                }, (_, i) => i + 1).map(page => {
                  // Show first page, last page, current page and 2 pages around current page
                  const totalPages = Math.ceil(totalSubmissions / itemsPerPage);
                  const shouldShow = page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2;
                  if (!shouldShow) return null;
                  return <PaginationItem key={page}>
                          <PaginationLink onClick={() => loadSubmissions(page)} isActive={currentPage === page} className="cursor-pointer">
                            {page}
                          </PaginationLink>
                        </PaginationItem>;
                })}
                    
                    {currentPage < Math.ceil(totalSubmissions / itemsPerPage) && <PaginationItem>
                        <PaginationNext onClick={() => loadSubmissions(currentPage + 1)} className="cursor-pointer" />
                      </PaginationItem>}
                  </PaginationContent>
                 </Pagination>
               </div>}
             </>}
          </div>}
      </div>

      {/* Upload Correction Dialog */}
      {selectedSubmission && (
        <UploadCorrectionDialog
          isOpen={isUploadDialogOpen}
          onClose={() => {
            setIsUploadDialogOpen(false);
            setSelectedSubmission(null);
          }}
          submissionId={selectedSubmission.id}
          studentName={getStudentName(selectedSubmission)}
          submission={selectedSubmission}
          onSuccess={() => {
            setIsUploadDialogOpen(false);
            setSelectedSubmission(null);
            loadSubmissions(currentPage);
          }}
        />
      )}

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={!!previewImageUrl}
        onClose={() => {
          setPreviewImageUrl(null);
          setPreviewImageTitle('');
        }}
        imageUrl={previewImageUrl || ''}
        title={previewImageTitle}
      />
    </>;
};
export default HomeworkSubmissions;