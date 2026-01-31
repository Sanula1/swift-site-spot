import React, { useState, useEffect } from 'react';
import PageContainer from '@/components/layout/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, ArrowLeft, Download, Search, BookOpen, Eye, CheckCircle, Clock, FileText, History, Shield, Plus, RefreshCw, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { subjectPaymentsApi, SubjectPayment, SubjectPaymentsResponse } from '@/api/subjectPayments.api';
import { institutePaymentsApi, PaymentSubmission } from '@/api/institutePayments.api';
import VerifySubmissionDialog from '@/components/forms/VerifySubmissionDialog';
import StudentSubmissionsDialog from '@/components/StudentSubmissionsDialog';
import CreateSubjectPaymentForm from '@/components/forms/CreateSubjectPaymentForm';
import SubmitSubjectPaymentDialog from '@/components/forms/SubmitSubjectPaymentDialog';
import { Skeleton } from '@/components/ui/skeleton';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
const SubjectPayments = () => {
  const {
    user,
    selectedInstitute,
    selectedClass,
    selectedSubject,
    isViewingAsParent
  } = useAuth();
  const instituteRole = useInstituteRole();
  
  // Check if institute type is tuition_institute
  const isTuitionInstitute = selectedInstitute?.type === 'tuition_institute';
  const subjectLabel = isTuitionInstitute ? 'Sub Class' : 'Subject';
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [subjectPaymentsData, setSubjectPaymentsData] = useState<SubjectPaymentsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<PaymentSubmission | null>(null);
  const [submissionsDialogOpen, setSubmissionsDialogOpen] = useState(false);
  const [createPaymentDialogOpen, setCreatePaymentDialogOpen] = useState(false);
  const [submitPaymentDialogOpen, setSubmitPaymentDialogOpen] = useState(false);
  const [selectedPaymentForSubmission, setSelectedPaymentForSubmission] = useState<SubjectPayment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mySubmissionsMap, setMySubmissionsMap] = useState<Record<string, { status: string; id: string }>>({});

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Track current context to prevent unnecessary reloads
  const contextKey = `${selectedInstitute?.id}-${selectedClass?.id}-${selectedSubject?.id}`;
  const [lastLoadedContext, setLastLoadedContext] = useState<string>('');

  // Auto-load subject payments when subject is selected
  useEffect(() => {
    if (selectedInstitute && selectedClass && selectedSubject && contextKey !== lastLoadedContext) {
      setLastLoadedContext(contextKey);
      setPage(0); // Reset to first page
      loadSubjectPayments(0, rowsPerPage, false); // Auto-load from cache
    }
  }, [contextKey]);

  // Load my submissions to get status for each payment
  const loadMySubmissions = async () => {
    if (!selectedInstitute || !selectedClass || !selectedSubject || instituteRole !== 'Student') return;
    
    try {
      const response = await subjectPaymentsApi.getMySubjectSubmissions(
        selectedInstitute.id, 
        selectedClass.id, 
        selectedSubject.id,
        1,
        100
      );
      
      // Create a map of paymentId -> submission status
      const submissionsMap: Record<string, { status: string; id: string }> = {};
      if (response.data && Array.isArray(response.data)) {
        response.data.forEach((submission: any) => {
          const paymentId = submission.paymentId || submission.paymentPreview?.id;
          if (paymentId) {
            submissionsMap[paymentId] = { 
              status: submission.status, 
              id: submission.id 
            };
          }
        });
      }
      setMySubmissionsMap(submissionsMap);
    } catch (error) {
      console.error('Failed to load my submissions:', error);
    }
  };

  // Load subject payments based on user role
  const loadSubjectPayments = async (pageNum: number = page, limitNum: number = rowsPerPage, forceRefresh: boolean = false) => {
    if (!selectedInstitute || !selectedClass || !selectedSubject) {
      toast({
        title: "Missing Selection",
        description: "Please select institute, class, and subject first.",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      let response: SubjectPaymentsResponse;
      if (instituteRole === 'Student') {
        // For students, use my-payments endpoint
        response = await subjectPaymentsApi.getMySubjectPayments(selectedInstitute.id, selectedClass.id, selectedSubject.id, pageNum + 1, limitNum, forceRefresh);
        // Also load submissions to get status
        await loadMySubmissions();
      } else if (instituteRole === 'InstituteAdmin' || instituteRole === 'Teacher') {
        // For admins and teachers, use regular endpoint
        response = await subjectPaymentsApi.getSubjectPayments(selectedInstitute.id, selectedClass.id, selectedSubject.id, pageNum + 1, limitNum, forceRefresh);
      } else {
        toast({
          title: "Access Denied",
          description: "You don't have permission to view subject payments.",
          variant: "destructive"
        });
        return;
      }
      setSubjectPaymentsData(response);
      toast({
        title: "Success",
        description: "Subject payments loaded successfully."
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load subject payments.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle verification for admins
  const handleVerify = (submission: PaymentSubmission) => {
    if (instituteRole !== 'InstituteAdmin') {
      toast({
        title: "Access Denied",
        description: "Only Institute Admins can verify submissions.",
        variant: "destructive"
      });
      return;
    }
    setSelectedSubmission(submission);
    setVerifyDialogOpen(true);
  };

  // View submissions for a payment (admins/teachers only)
  const viewSubmissions = (payment: SubjectPayment) => {
    if (instituteRole !== 'InstituteAdmin' && instituteRole !== 'Teacher') {
      toast({
        title: "Access Denied",
        description: "You don't have permission to view submissions.",
        variant: "destructive"
      });
      return;
    }
    navigate(`/payment-submissions?paymentId=${payment.id}&paymentTitle=${encodeURIComponent(payment.title)}`);
  };

  // Handle view my submissions for students
  const handleViewMySubmissions = () => {
    if (instituteRole !== 'Student') {
      toast({
        title: "Access Denied",
        description: "This feature is only available for students.",
        variant: "destructive"
      });
      return;
    }
    setSubmissionsDialogOpen(true);
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'MANDATORY':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'OPTIONAL':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Pagination handlers
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
    loadSubjectPayments(newPage, rowsPerPage);
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = +event.target.value;
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    loadSubjectPayments(0, newRowsPerPage);
  };

  // Handle search with live filtering
  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

  // Filter data locally for live search
  const filteredPayments = React.useMemo(() => {
    if (!subjectPaymentsData?.data) return [];
    if (!searchQuery.trim()) return subjectPaymentsData.data;
    const searchLower = searchQuery.toLowerCase();
    return subjectPaymentsData.data.filter(payment => {
      // Search in Title
      const matchesTitle = payment.title?.toLowerCase().includes(searchLower);

      // Search in Amount (convert to string and search)
      const matchesAmount = payment.amount?.toString().includes(searchQuery.trim());

      // Search in Priority
      const matchesPriority = payment.priority?.toLowerCase().includes(searchLower);
      return matchesTitle || matchesAmount || matchesPriority;
    });
  }, [subjectPaymentsData?.data, searchQuery]);

  // Table columns configuration
  const columns = [{
    id: 'title',
    label: 'Title',
    minWidth: 200
  }, {
    id: 'amount',
    label: 'Amount (Rs)',
    minWidth: 120,
    align: 'right' as const
  }, {
    id: 'status',
    label: 'Status',
    minWidth: 100
  }, ...(instituteRole !== 'Student' ? [{
    id: 'priority',
    label: 'Priority',
    minWidth: 100
  }] : []), {
    id: 'dueDate',
    label: 'Due Date',
    minWidth: 120
  }, 
  // Submission status column for students
  ...(instituteRole === 'Student' ? [{
    id: 'mySubmissionStatus',
    label: 'My Submission',
    minWidth: 120
  }] : []),
  ...(instituteRole !== 'Student' ? [{
    id: 'submissions',
    label: 'Submissions',
    minWidth: 150
  }] : []), {
    id: 'actions',
    label: 'Actions',
    minWidth: 200
  }];
  return <PageContainer className="h-full">
      {/* Header Section - Mobile Optimized */}
      <div className="flex flex-col space-y-3 sm:space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-2 sm:gap-4 min-w-0">
            <Button variant="ghost" onClick={() => navigate(-1)} className="shrink-0 p-2 sm:p-2.5" size="sm">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Back</span>
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground truncate">
                {subjectLabel} Payments
              </h1>
              {selectedSubject && <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 sm:mt-1 truncate">
                  {subjectLabel}: <span className="font-medium text-foreground">{selectedSubject.name}</span>
                </p>}
            </div>
          </div>
          {(instituteRole === 'InstituteAdmin' || instituteRole === 'Teacher') && <Button onClick={() => setCreatePaymentDialogOpen(true)} className="shrink-0 w-full sm:w-auto" size="sm" disabled={!selectedInstitute || !selectedClass || !selectedSubject}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create Payment
            </Button>}
        </div>
      </div>

      {/* Subject Info Card - Mobile Optimized */}
      {selectedSubject && <Card className="border-border">
          <CardHeader className="p-3 sm:p-4 md:pb-4">
            <CardTitle className="flex items-center gap-2 text-foreground text-sm sm:text-base">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0" />
              <span className="truncate">{selectedSubject.name}</span>
            </CardTitle>
            {selectedClass && <p className="text-muted-foreground text-xs sm:text-sm mt-1 truncate">
                Class: {selectedClass.name} | Institute: {selectedInstitute?.name}
              </p>}
          </CardHeader>
        </Card>}

      {/* Search and Actions - Mobile Optimized */}
      <Card>
        <CardContent className="p-3 sm:p-4 md:pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search payments..." className="pl-9 sm:pl-10 w-full text-sm" value={searchQuery} onChange={e => handleSearch(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" onClick={() => loadSubjectPayments(page, rowsPerPage, true)} disabled={loading || !selectedInstitute || !selectedClass || !selectedSubject} size="sm" className="flex-1 sm:flex-none">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="ml-1.5 sm:ml-2">{loading ? 'Loading...' : 'Refresh'}</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </CardContent>
        </Card>}

      {/* Subject Payments Table */}
      {!loading && <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5 text-primary" />
                {instituteRole === 'Student' ? `My ${subjectLabel} Payments` : `${subjectLabel} Payment Records`}
              </CardTitle>
              {subjectPaymentsData && <Badge variant="outline" className="text-sm">
                  {filteredPayments.length} of {subjectPaymentsData.total} total
                </Badge>}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {!subjectPaymentsData ? <div className="flex flex-col items-center justify-center py-20 px-6">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Subject Payments
                </h2>
                <p className="text-muted-foreground text-base mb-8 text-center max-w-md">
                  Click the button below to load payments data
                </p>
                <Button 
                  onClick={() => loadSubjectPayments()} 
                  disabled={loading || !selectedInstitute || !selectedClass || !selectedSubject}
                  size="lg"
                  className="px-8 py-6 text-base"
                >
                  <RefreshCw className={`h-5 w-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  {loading ? 'Loading...' : 'Load Data'}
                </Button>
              </div> : <Paper sx={{
            width: '100%',
            overflow: 'hidden'
          }}>
                <TableContainer sx={{
              minHeight: '500px',
              overflow: 'auto'
            }}>
                  <Table stickyHeader aria-label="subject payments table">
                    <TableHead>
                      <TableRow>
                        {columns.map(column => <TableCell key={column.id} align={column.align} style={{
                      minWidth: column.minWidth
                    }} sx={{
                      fontWeight: 600,
                      position: 'sticky',
                      top: 0,
                      zIndex: 2,
                      backgroundColor: 'hsl(var(--muted))',
                      color: 'hsl(var(--foreground))',
                      borderBottom: '1px solid hsl(var(--border))'
                    }}>
                            {column.label}
                          </TableCell>)}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredPayments.length === 0 ? <TableRow>
                          <TableCell colSpan={columns.length} align="center">
                            <div className="py-12">
                              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                              <p className="text-muted-foreground text-lg mb-2">
                                {searchQuery ? 'No matching payments found' : 'No payments found'}
                              </p>
                              <p className="text-muted-foreground text-sm">
                                {searchQuery ? 'Try adjusting your search criteria.' : 'Subject payments will appear here when created.'}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow> : filteredPayments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(payment => <TableRow hover role="checkbox" tabIndex={-1} key={payment.id}>
                              <TableCell>
                                <div>
                                  <div className="font-medium text-foreground">
                                    {payment.title}
                                  </div>
                                  <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {payment.description || '-'}
                                  </div>
                                  <div className="text-xs text-muted-foreground mt-1">
                                    Target: {payment.targetType}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell align="right">
                                <div className="font-semibold text-lg text-primary">
                                  Rs {Number(payment.amount).toLocaleString()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className={getStatusColor(payment.status)}>
                                  {payment.status}
                                </Badge>
                              </TableCell>
                              {instituteRole !== 'Student' && (
                                <TableCell>
                                  <Badge className={getPriorityColor(payment.priority)}>
                                    {payment.priority}
                                  </Badge>
                                </TableCell>
                              )}
                              <TableCell>
                                {new Date(payment.lastDate).toLocaleDateString()}
                              </TableCell>
                              {/* Submission status for students */}
                              {instituteRole === 'Student' && (
                                <TableCell>
                                  {(() => {
                                    const submissionData = mySubmissionsMap[payment.id];
                                    const hasSubmitted = submissionData || payment.hasSubmitted || payment.mySubmissionStatus;
                                    const status = submissionData?.status || payment.mySubmissionStatus;
                                    
                                    if (!hasSubmitted) {
                                      return <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">Not Submitted</Badge>;
                                    }
                                    switch (status) {
                                      case 'VERIFIED':
                                        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-3 w-3 mr-1" />Verified</Badge>;
                                      case 'PENDING':
                                        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
                                      case 'REJECTED':
                                        return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
                                      default:
                                        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Submitted</Badge>;
                                    }
                                  })()}
                                </TableCell>
                              )}
                              {instituteRole !== 'Student' && (
                                <TableCell>
                                  {(instituteRole === 'InstituteAdmin' || instituteRole === 'Teacher') && <div className="text-xs space-y-1">
                                      <div className="flex items-center space-x-1">
                                        <FileText className="h-3 w-3" />
                                        <span>Total: {payment.submissionsCount || 0}</span>
                                      </div>
                                      <div className="flex items-center space-x-1 text-green-600">
                                        <CheckCircle className="h-3 w-3" />
                                        <span>Verified: {payment.verifiedSubmissionsCount || 0}</span>
                                      </div>
                                      <div className="flex items-center space-x-1 text-yellow-600">
                                        <Clock className="h-3 w-3" />
                                        <span>Pending: {payment.pendingSubmissionsCount || 0}</span>
                                      </div>
                                    </div>}
                                </TableCell>
                              )}
                              <TableCell>
                                <div className="flex flex-col space-y-1">
                                  {instituteRole === 'Student' && (
                                    (() => {
                                      // Parent viewing mode - show view only badge
                                      if (isViewingAsParent) {
                                        return (
                                          <Badge variant="secondary" className="bg-muted text-muted-foreground">
                                            <Eye className="h-3 w-3 mr-1" />
                                            View Only
                                          </Badge>
                                        );
                                      }
                                      
                                      const submissionData = mySubmissionsMap[payment.id];
                                      const hasSubmitted = submissionData || payment.hasSubmitted || payment.mySubmissionStatus;
                                      const status = submissionData?.status || payment.mySubmissionStatus;
                                      
                                      if (hasSubmitted) {
                                        return (
                                          <Badge 
                                            className={
                                              status === 'VERIFIED' 
                                                ? "bg-green-100 text-green-800 border-green-200"
                                                : status === 'PENDING'
                                                ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                                : status === 'REJECTED'
                                                ? "bg-red-100 text-red-800 border-red-200"
                                                : "bg-blue-100 text-blue-800 border-blue-200"
                                            }
                                          >
                                            {status === 'VERIFIED' && <CheckCircle className="h-3 w-3 mr-1" />}
                                            {status === 'PENDING' && <Clock className="h-3 w-3 mr-1" />}
                                            {status === 'REJECTED' && <XCircle className="h-3 w-3 mr-1" />}
                                            Already Submitted
                                          </Badge>
                                        );
                                      }
                                      return (
                                        <Button variant="default" size="sm" onClick={() => {
                                          setSelectedPaymentForSubmission(payment);
                                          setSubmitPaymentDialogOpen(true);
                                        }} className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white">
                                          <CreditCard className="h-3 w-3" />
                                          <span>Submit</span>
                                        </Button>
                                      );
                                    })()
                                  )}
                                  
                                  {(instituteRole === 'InstituteAdmin' || instituteRole === 'Teacher') && <Button variant="default" size="sm" onClick={() => viewSubmissions(payment)} className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white">
                                      <Eye className="h-3 w-3" />
                                      <span>View</span>
                                    </Button>}
                                </div>
                              </TableCell>
                            </TableRow>)}
                    </TableBody>
                  </Table>
                </TableContainer>
                <TablePagination rowsPerPageOptions={[25, 50, 100]} component="div" count={searchQuery ? filteredPayments.length : subjectPaymentsData.total || 0} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} />
              </Paper>}
          </CardContent>
        </Card>}

      {/* Summary Stats */}
      {subjectPaymentsData && <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Active Amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                Rs {subjectPaymentsData.data.filter(p => p.status === 'ACTIVE').reduce((sum, p) => sum + parseFloat(p.amount), 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {subjectPaymentsData.total}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Mandatory Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {subjectPaymentsData.data.filter(p => p.priority === 'MANDATORY').length}
              </p>
            </CardContent>
          </Card>
        </div>}

        {/* Verify Dialog for Institute Admins */}
        {selectedInstitute && instituteRole === 'InstituteAdmin' && <VerifySubmissionDialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen} submission={selectedSubmission} instituteId={selectedInstitute.id} onSuccess={() => {
        setVerifyDialogOpen(false);
        setSelectedSubmission(null);
        loadSubjectPayments(); // Reload data after verification
      }} />}

        {/* Student Submissions Dialog */}
        {user?.userType === 'Student' && selectedInstitute && selectedClass && selectedSubject && <StudentSubmissionsDialog open={submissionsDialogOpen} onOpenChange={setSubmissionsDialogOpen} instituteId={selectedInstitute.id} classId={selectedClass.id} subjectId={selectedSubject.id} />}

        {/* Create Subject Payment Dialog */}
        {selectedInstitute && selectedClass && selectedSubject && <CreateSubjectPaymentForm open={createPaymentDialogOpen} onOpenChange={setCreatePaymentDialogOpen} instituteId={selectedInstitute.id} classId={selectedClass.id} subjectId={selectedSubject.id} onSuccess={loadSubjectPayments} />}

        {/* Submit Payment Dialog for Students - disabled for parent viewing */}
        {instituteRole === 'Student' && !isViewingAsParent && selectedPaymentForSubmission && <SubmitSubjectPaymentDialog open={submitPaymentDialogOpen} onOpenChange={setSubmitPaymentDialogOpen} payment={selectedPaymentForSubmission} onSuccess={() => {
        setSubmitPaymentDialogOpen(false);
        setSelectedPaymentForSubmission(null);
        loadSubjectPayments();
      }} />}

    </PageContainer>;
};
export default SubjectPayments;