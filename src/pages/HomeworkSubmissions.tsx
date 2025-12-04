import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { homeworkSubmissionsApi, type HomeworkSubmission } from '@/api/homeworkSubmissions.api';
import { AccessControl, UserRole } from '@/utils/permissions';
import { FileText, Calendar, User, ExternalLink, RefreshCw, ArrowLeft, BookOpen, School, Users, Lock, Edit } from 'lucide-react';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import UploadCorrectionDialog from '@/components/forms/UploadCorrectionDialog';
const HomeworkSubmissions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, selectedInstitute, selectedClass, selectedSubject, currentInstituteId, currentClassId, currentSubjectId } = useAuth();
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

  // Check if user can edit (Teacher or InstituteAdmin)
  const canEdit = instituteRole === 'Teacher' || instituteRole === 'InstituteAdmin';

  const loadSubmissions = async (page = 1) => {
    if (!currentInstituteId || !currentClassId || !currentSubjectId) {
      console.error('Missing context for loading submissions:', { 
        currentInstituteId, 
        currentClassId, 
        currentSubjectId 
      });
      toast({
        title: "Missing Selection",
        description: "Please select institute, class, and subject to view submissions.",
        variant: "destructive"
      });
      return;
    }

    console.log('🔄 Loading homework submissions for:', { 
      currentInstituteId, 
      currentClassId, 
      currentSubjectId, 
      page,
      userId: user?.id
    });

    setIsLoading(true);
    try {
      // First try the general submissions API
      console.log('📡 Making API call to get submissions...');
      const response = await homeworkSubmissionsApi.getSubmissions({
        page,
        limit: itemsPerPage,
        sortBy: 'submissionDate',
        sortOrder: 'DESC'
      }, true);

      console.log('📊 Raw API response:', response);

      const submissionsList = Array.isArray(response) ? response : response.data || [];
      const meta = Array.isArray(response) ? { total: submissionsList.length } : response.meta || { total: submissionsList.length };
      
      console.log('✅ Processed submissions data:', { 
        submissionsList, 
        meta,
        submissionsCount: submissionsList.length,
        totalCount: meta.total 
      });
      
      setSubmissions(submissionsList);
      setTotalSubmissions(meta.total || submissionsList.length);
      setCurrentPage(page);
      setLastRefresh(new Date());

      // Show feedback to user
      const message = submissionsList.length > 0 
        ? `Found ${submissionsList.length} homework submissions`
        : 'No homework submissions found for the current selection';
        
      console.log('🎯 Final state update:', { 
        submissionsSet: submissionsList.length,
        totalSubmissionsSet: meta.total || submissionsList.length 
      });

      toast({
        title: submissionsList.length > 0 ? "Submissions Loaded" : "No Submissions",
        description: message,
        variant: submissionsList.length > 0 ? "default" : "destructive"
      });
      
    } catch (error) {
      console.error('❌ Error loading submissions:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      toast({
        title: "Error", 
        description: error instanceof Error ? error.message : "Failed to load homework submissions",
        variant: "destructive"
      });
      
      // Set empty state on error
      setSubmissions([]);
      setTotalSubmissions(0);
    } finally {
      setIsLoading(false);
      console.log('🏁 Loading completed');
    }
  };

  useEffect(() => {
    if (currentInstituteId && currentClassId && currentSubjectId && contextKey !== lastLoadedContext) {
      setLastLoadedContext(contextKey);
      loadSubmissions(1);
    }
  }, [contextKey]);

  const formatDate = (dateString: string | Date | any) => {
    try {
      // Handle empty objects or invalid dates
      if (!dateString || (typeof dateString === 'object' && Object.keys(dateString).length === 0)) {
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
    return (
      <div className="container mx-auto p-6">
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
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleGoBack}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Homework
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">
              Homework Submissions
            </h1>
            <p className="text-muted-foreground mt-1">
              {getContextTitle() && `${getContextTitle()} • `}View and manage all homework submissions
            </p>
            {lastRefresh && (
              <p className="text-sm text-muted-foreground mt-1">
                Last refreshed: {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        {/* Context Info Card */}
        {selectedInstitute && selectedClass && selectedSubject && (
          <Card>
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
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">
            All Submissions ({submissions.length})
          </h2>
          <Button
            variant="outline"
            onClick={() => loadSubmissions(currentPage)}
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

        {/* Check for missing context */}
        {(!currentInstituteId || !currentClassId || !currentSubjectId) ? (
          <Card>
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Missing Context</h3>
              <p className="text-muted-foreground mb-4">
                Please select institute, class, and subject to view homework submissions.
              </p>
              <Button onClick={() => navigate('/homework')}>
                Go to Homework
              </Button>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading submissions...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Debug Info - Remove this after fixing */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-800 mb-2">Debug Info:</h4>
              <div className="text-sm text-blue-700 space-y-1">
                <div>Submissions Length: {submissions.length}</div>
                <div>Total Submissions: {totalSubmissions}</div>
                <div>Current Page: {currentPage}</div>
                <div>Is Loading: {isLoading ? 'Yes' : 'No'}</div>
                <div>Context: {currentInstituteId}/{currentClassId}/{currentSubjectId}</div>
              </div>
            </div>

            {submissions.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Submissions Found</h3>
                  <p className="text-muted-foreground mb-4">
                    No homework submissions found for the selected context.
                  </p>
                  <Button onClick={() => loadSubmissions(1)} variant="outline">
                    Refresh Data
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Student Submissions Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Student Submissions ({submissions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">ID</TableHead>
                        <TableHead>Student Details</TableHead>
                        <TableHead>Homework Assignment</TableHead>
                        <TableHead>Submission Info</TableHead>
                        <TableHead>File Status</TableHead>
                        <TableHead>Teacher Feedback</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {submissions.map((submission, index) => (
                        <TableRow key={submission.id} className="hover:bg-muted/50">
                          <TableCell className="font-mono text-sm">
                            #{(currentPage - 1) * itemsPerPage + index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <div className="font-medium">
                                  {submission.student?.firstName} {submission.student?.lastName}
                                </div>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {submission.student?.email || 'No email'}
                              </div>
                              <Badge variant={submission.isActive ? 'default' : 'secondary'} className="text-xs">
                                {submission.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium text-sm">
                                {submission.homework?.title || 'Unknown Assignment'}
                              </div>
                              {submission.homework?.description && (
                                <div className="text-sm text-muted-foreground line-clamp-2 max-w-[250px]">
                                  {submission.homework.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>{formatDate(submission.submissionDate)}</span>
                              </div>
                              {submission.remarks && (
                                <div className="bg-muted/50 p-2 rounded text-xs">
                                  <div className="text-muted-foreground mb-1">Student Notes:</div>
                                  <div className="line-clamp-2">{submission.remarks}</div>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              {submission.fileUrl ? (
                                <div className="flex items-center gap-2 text-sm text-green-600">
                                  <FileText className="h-4 w-4" />
                                  <span>Submitted</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-sm text-red-500">
                                  <FileText className="h-4 w-4" />
                                  <span>No File</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                              {submission.teacherCorrectionFileUrl ? (
                                <div className="flex items-center gap-2 text-sm text-blue-600">
                                  <FileText className="h-4 w-4" />
                                  <span>Corrected</span>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <FileText className="h-4 w-4" />
                                    <span>Pending</span>
                                  </div>
                                  {canEdit && (
                                    <Button
                                      size="default"
                                      variant="destructive"
                                      onClick={() => {
                                        console.log('Setting selected submission:', submission);
                                        setSelectedSubmission(submission);
                                        setIsUploadDialogOpen(true);
                                      }}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Upload Correction
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end flex-wrap">
                              {submission.fileUrl && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(submission.fileUrl, '_blank')}
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View Submission
                                </Button>
                              )}
                              {submission.teacherCorrectionFileUrl && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(submission.teacherCorrectionFileUrl, '_blank')}
                                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  View Correction
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Pagination */}
            {Math.ceil(totalSubmissions / itemsPerPage) > 1 && (
              <div className="flex justify-center">
                <Pagination>
                  <PaginationContent>
                    {currentPage > 1 && (
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => loadSubmissions(currentPage - 1)}
                          className="cursor-pointer"
                        />
                      </PaginationItem>
                    )}
                    
                    {Array.from({ length: Math.ceil(totalSubmissions / itemsPerPage) }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page and 2 pages around current page
                      const totalPages = Math.ceil(totalSubmissions / itemsPerPage);
                      const shouldShow = 
                        page === 1 || 
                        page === totalPages || 
                        Math.abs(page - currentPage) <= 2;
                      
                      if (!shouldShow) return null;
                      
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => loadSubmissions(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    
                    {currentPage < Math.ceil(totalSubmissions / itemsPerPage) && (
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => loadSubmissions(currentPage + 1)}
                          className="cursor-pointer"
                        />
                      </PaginationItem>
                    )}
                  </PaginationContent>
                 </Pagination>
               </div>
             )}
             </>
       )}
          </div>
        )}
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
          studentName={`${selectedSubmission.student?.firstName || ''} ${selectedSubmission.student?.lastName || ''}`}
          submission={selectedSubmission}
          onSuccess={() => {
            setIsUploadDialogOpen(false);
            setSelectedSubmission(null);
            loadSubmissions(currentPage);
          }}
        />
      )}
    </>
  );
};

export default HomeworkSubmissions;