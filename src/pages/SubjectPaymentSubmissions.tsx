import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle, AlertCircle, Calendar, DollarSign, Clock, XCircle, Download, Eye } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useInstituteRole } from '@/hooks/useInstituteRole';

// Helper to get subject label based on institute type
const getSubjectLabel = (instituteType?: string) => {
  return instituteType === 'tuition_institute' ? 'Sub Class' : 'Subject';
};
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import { enhancedCachedClient } from '@/api/enhancedCachedClient';
import { CACHE_TTL } from '@/config/cacheTTL';
import { getImageUrl } from '@/utils/imageUrlHelper';
interface PaymentSubmission {
  id: string;
  paymentId: string;
  userId: string;
  userType: string;
  username: string;
  paymentDate: string;
  receiptUrl: string;
  receiptFilename: string;
  transactionId: string;
  submittedAmount: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  notes: string;
  uploadedAt: string;
  updatedAt: string;
  paymentPreview: {
    id: string;
    title: string;
    description: string;
    amount: number;
    lastDate: string;
    status: string;
    isActive: boolean;
    priority: string;
    targetType: string;
    createdBy: {
      id: string;
      name: string;
    };
    createdAt: string;
  };
  submissionPreview: {
    receiptPreview: {
      filename: string;
      url: string;
      canView: boolean;
    };
    submissionSummary: {
      submittedAmount: number;
      transactionReference: string;
      paymentMethod: string;
      submissionDate: string;
      processingTime: string | null;
    };
    verificationPreview: any;
  };
  statusIndicators: {
    isPending: boolean;
    isVerified: boolean;
    isRejected: boolean;
    canResubmit: boolean;
    paymentIsActive: boolean;
    isOverdue: boolean;
  };
  availableActions: {
    canView: boolean;
    canDownloadReceipt: boolean;
    canResubmit: boolean;
    canDelete: boolean;
  };
}
interface SubmissionsResponse {
  success: boolean;
  message: string;
  data: PaymentSubmission[];
  summary: {
    total: number;
    byStatus: {
      pending: number;
      verified: number;
      rejected: number;
    };
    byPaymentStatus: {
      activePayments: number;
      inactivePayments: number;
    };
    totalAmountSubmitted: number;
    latestSubmission: string;
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => string;
}
const columns: readonly Column[] = [{
  id: 'paymentTitle',
  label: 'Payment Title',
  minWidth: 150
}, {
  id: 'description',
  label: 'Description',
  minWidth: 150
}, {
  id: 'submittedAmount',
  label: 'Amount',
  minWidth: 120,
  align: 'right'
}, {
  id: 'transactionId',
  label: 'Transaction ID',
  minWidth: 150
}, {
  id: 'paymentDate',
  label: 'Payment Date',
  minWidth: 120
}, {
  id: 'status',
  label: 'Status',
  minWidth: 100,
  align: 'center'
}, {
  id: 'priority',
  label: 'Priority',
  minWidth: 100
}, {
  id: 'uploadedAt',
  label: 'Submitted At',
  minWidth: 120
}, {
  id: 'verifiedAt',
  label: 'Verified At',
  minWidth: 120
}, {
  id: 'notes',
  label: 'Notes',
  minWidth: 150
}, {
  id: 'receipt',
  label: 'Receipt',
  minWidth: 120,
  align: 'center'
}];
const SubjectPaymentSubmissions = () => {
  const {
    user,
    selectedInstitute,
    selectedClass,
    selectedSubject
  } = useAuth();
  const instituteRole = useInstituteRole();
  const {
    toast
  } = useToast();
  const [submissionsData, setSubmissionsData] = useState<SubmissionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('PENDING');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const loadSubmissions = async (currentPage: number = 1, limit: number = 50, forceRefresh = false) => {
    if (!selectedInstitute || !selectedClass || !selectedSubject) return;
    setLoading(true);
    try {
      const result = await enhancedCachedClient.get(
        `/institute-class-subject-payment-submissions/institute/${selectedInstitute.id}/class/${selectedClass.id}/subject/${selectedSubject.id}/my-submissions?page=${currentPage}&limit=${limit}`,
        {},
        {
          ttl: CACHE_TTL.PAYMENT_SUBMISSIONS,
          forceRefresh,
          userId: user?.id,
          role: instituteRole,
          instituteId: selectedInstitute.id,
          classId: selectedClass.id,
          subjectId: selectedSubject.id
        }
      );
      
      setSubmissionsData(result);
      toast({
        title: "Success",
        description: `Loaded ${result.data.length} payment submissions`
      });
    } catch (error) {
      console.error('Failed to load submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load payment submissions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-load submissions when context changes (uses cache if available)
  useEffect(() => {
    if (selectedInstitute && selectedClass && selectedSubject) {
      loadSubmissions(1, rowsPerPage, false); // Load from cache
    }
  }, [selectedInstitute?.id, selectedClass?.id, selectedSubject?.id]);

  // Check if user is logged in
  if (!user) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground text-lg">
          Please log in to access this page
        </p>
      </div>
    );
  }

  // Check if institute is selected first before checking role
  if (!selectedInstitute) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground text-lg mb-4">
          Please select an Institute first
        </p>
        <p className="text-sm text-muted-foreground">
          You need to select an institute to access this page
        </p>
      </div>
    );
  }

  // Now check if user is Student (using instituteUserType)
  const isStudent = instituteRole === 'Student';
  if (!isStudent) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground text-lg">
          This page is only accessible to Students
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Your role in {selectedInstitute.name}: {instituteRole}
        </p>
      </div>
    );
  }
  
  if (!selectedClass || !selectedSubject) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground text-lg mb-4">
          Please select Institute, Class, and Subject first
        </p>
        <div className="text-sm text-muted-foreground">
          {!selectedInstitute && <p>• Institute not selected</p>}
          {!selectedClass && <p>• Class not selected</p>}
          {!selectedSubject && <p>• Subject not selected</p>}
        </div>
      </div>
    );
  }

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
    loadSubmissions(newPage + 1, rowsPerPage);
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = +event.target.value;
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    loadSubmissions(1, newRowsPerPage);
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-300';
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <CheckCircle className="h-4 w-4" />;
      case 'PENDING':
        return <Clock className="h-4 w-4" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };
  const filterSubmissionsByStatus = (status: string) => {
    if (!submissionsData) return [];
    return submissionsData.data.filter(submission => submission.status === status);
  };
  const handleViewReceipt = (receiptUrl: string) => {
    window.open(getImageUrl(receiptUrl), '_blank');
  };
  const handleDownloadReceipt = (receiptUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = getImageUrl(receiptUrl);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const renderTableContent = (submissions: PaymentSubmission[]) => <Paper sx={{
    width: '100%',
    overflow: 'hidden'
  }}>
      <TableContainer sx={{
      height: 'calc(100vh - 450px)',
      minHeight: 400
    }}>
        <Table stickyHeader aria-label="submissions table">
          <TableHead>
            <TableRow>
              {columns.map(column => <TableCell key={column.id} align={column.align} style={{
              minWidth: column.minWidth
            }}>
                  {column.label}
                </TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            {submissions.length === 0 ? <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{
              py: 8
            }}>
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground text-lg mb-2">
                      No submissions found
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Payment submissions will appear here when available.
                    </p>
                  </div>
                </TableCell>
              </TableRow> : submissions.map(submission => <TableRow hover role="checkbox" tabIndex={-1} key={submission.id}>
                  <TableCell>{submission.paymentPreview.title}</TableCell>
                  <TableCell>{submission.paymentPreview.description}</TableCell>
                  <TableCell align="right">
                    Rs {parseFloat(submission.submittedAmount).toLocaleString()}
                  </TableCell>
                  <TableCell>{submission.transactionId}</TableCell>
                  <TableCell>
                    {new Date(submission.paymentDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(submission.status)}`}>
                      {getStatusIcon(submission.status)}
                      <span className="ml-1">{submission.status}</span>
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={submission.paymentPreview.priority === 'MANDATORY' ? 'destructive' : 'secondary'}>
                      {submission.paymentPreview.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(submission.uploadedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {submission.verifiedAt ? new Date(submission.verifiedAt).toLocaleDateString() : '-'}
                  </TableCell>
                  <TableCell>
                    {submission.notes ? <div className="max-w-32 truncate" title={submission.notes}>
                        {submission.notes}
                      </div> : '-'}
                  </TableCell>
                  <TableCell align="center">
                    <div className="flex items-center space-x-1">
                      {submission.availableActions.canView && <Button size="sm" variant="outline" onClick={() => handleViewReceipt(submission.receiptUrl)}>
                          <Eye className="h-3 w-3" />
                        </Button>}
                      {submission.availableActions.canDownloadReceipt}
                    </div>
                  </TableCell>
                </TableRow>)}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination rowsPerPageOptions={[25, 50, 100]} component="div" count={submissionsData?.pagination.total || 0} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} />
    </Paper>;
  const subjectLabel = getSubjectLabel(selectedInstitute?.type);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{subjectLabel} Payment Submissions</h1>
          <div className="mt-2 text-sm text-muted-foreground">
            <p><strong>Institute:</strong> {selectedInstitute.name}</p>
            <p><strong>Class:</strong> {selectedClass.name}</p>
            <p><strong>{subjectLabel}:</strong> {selectedSubject.name}</p>
          </div>
        </div>
        <Button onClick={() => loadSubmissions(1, rowsPerPage, true)} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* Summary Stats */}
      {submissionsData && <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{submissionsData.summary.total}</p>
                  <p className="text-sm text-muted-foreground">Total Submissions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold">{submissionsData.summary.byStatus.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{submissionsData.summary.byStatus.verified}</p>
                  <p className="text-sm text-muted-foreground">Verified</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <XCircle className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">{submissionsData.summary.byStatus.rejected}</p>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>}

      {/* Submissions Tabs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Payment Submissions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!submissionsData ? <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg mb-2">
                Click "Load Submissions" to view your payment submissions
              </p>
            </div> : <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="PENDING" className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Pending ({submissionsData.summary.byStatus.pending})</span>
                </TabsTrigger>
                <TabsTrigger value="VERIFIED" className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Verified ({submissionsData.summary.byStatus.verified})</span>
                </TabsTrigger>
                <TabsTrigger value="REJECTED" className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4" />
                  <span>Rejected ({submissionsData.summary.byStatus.rejected})</span>
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="PENDING" className="mt-6">
                {renderTableContent(filterSubmissionsByStatus('PENDING'))}
              </TabsContent>
              
              <TabsContent value="VERIFIED" className="mt-6">
                {renderTableContent(filterSubmissionsByStatus('VERIFIED'))}
              </TabsContent>
              
              <TabsContent value="REJECTED" className="mt-6">
                {renderTableContent(filterSubmissionsByStatus('REJECTED'))}
              </TabsContent>
            </Tabs>}
        </CardContent>
      </Card>
    </div>
  );
};
export default SubjectPaymentSubmissions;