import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Eye, CheckCircle, Clock, XCircle, User, Calendar, FileText, DollarSign, Shield, RefreshCw, School, Search, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { subjectPaymentsApi, SubjectPaymentSubmission } from '@/api/subjectPayments.api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import VerifySubjectPaymentDialog from '@/components/forms/VerifySubjectPaymentDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PDFViewer } from '@/components/ui/pdf-viewer';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
const PaymentSubmissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    user,
    selectedInstitute,
    selectedClass,
    selectedSubject
  } = useAuth();
  const role = useInstituteRole();
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('paymentId');
  const paymentTitle = searchParams.get('paymentTitle');
  const [submissions, setSubmissions] = useState<SubjectPaymentSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [verifyingSubmission, setVerifyingSubmission] = useState<SubjectPaymentSubmission | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState('');

  // Check if user can verify submissions (InstituteAdmin or Teacher only)
  const canVerifySubmissions = role === 'InstituteAdmin' || role === 'Teacher';
  const loadSubmissions = async (newPage?: number, newRowsPerPage?: number) => {
    if (loading || !paymentId) return;
    const currentPage = newPage !== undefined ? newPage + 1 : page + 1; // API uses 1-based indexing
    const currentLimit = newRowsPerPage || rowsPerPage;
    setLoading(true);
    try {
      const response = await subjectPaymentsApi.getPaymentSubmissions(paymentId, currentPage, currentLimit);
      setSubmissions(response.data);
      setTotalCount(response.total);
      setLoaded(true);
      toast({
        title: "Success",
        description: "Payment submissions loaded successfully."
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load payment submissions.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const handleVerifySubmission = async (status: 'VERIFIED' | 'REJECTED', rejectionReason?: string, notes?: string) => {
    if (!verifyingSubmission) return;
    try {
      await subjectPaymentsApi.verifyPaymentSubmission(verifyingSubmission.id, {
        status,
        rejectionReason,
        notes
      });
      toast({
        title: "Success",
        description: `Payment submission ${status.toLowerCase()} successfully.`
      });

      // Reload submissions
      setLoaded(false);
      await loadSubmissions(page, rowsPerPage);
      setVerifyingSubmission(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to verify payment submission.",
        variant: "destructive"
      });
    }
  };
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
    loadSubmissions(newPage, rowsPerPage);
  };
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = +event.target.value;
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    loadSubmissions(0, newRowsPerPage);
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  // Filter submissions based on search term
  const filteredSubmissions = submissions.filter(submission => submission.username?.toLowerCase().includes(searchTerm.toLowerCase()) || submission.submittedAmount?.toString().includes(searchTerm) || submission.transactionId?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
  const handleRefresh = () => {
    setLoaded(false);
    setSearchTerm('');
    loadSubmissions(0, rowsPerPage);
  };
  const columns = [{
    id: 'username',
    label: 'Student Name',
    minWidth: 150
  }, {
    id: 'submittedAmount',
    label: 'Amount',
    minWidth: 100,
    align: 'right' as const
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
    minWidth: 100
  }, {
    id: 'uploadedAt',
    label: 'Submitted At',
    minWidth: 120
  }, {
    id: 'receipt',
    label: 'Receipt',
    minWidth: 100
  }, {
    id: 'actions',
    label: 'Actions',
    minWidth: 150
  }];
  return <AppLayout>
      <div className="space-y-3 sm:space-y-4 px-2 sm:px-4 py-3 sm:py-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4" size="sm">
            <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="text-xs sm:text-sm">Back</span>
          </Button>
        </div>

        {/* Subject Info */}
        {selectedSubject && <Card className="border-border">
            <CardHeader className="p-3 sm:p-4">
              <CardTitle className="flex items-center gap-2 text-sm sm:text-base text-foreground">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <span className="truncate">{selectedSubject.name}</span>
              </CardTitle>
              <p className="text-muted-foreground text-xs sm:text-sm truncate">
                {selectedClass?.name} • {selectedInstitute?.name}
              </p>
            </CardHeader>
          </Card>}


        {/* Payment Submissions Section */}
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <div className="flex flex-col gap-2 sm:gap-3">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base md:text-lg">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span className="truncate">Payment Submissions</span>
                  </CardTitle>
                  {paymentId && <p className="text-xs sm:text-sm text-muted-foreground truncate mt-1">
                      Payment ID: {paymentId}
                    </p>}
                </div>
                <Button onClick={handleRefresh} disabled={loading} variant="outline" size="sm" className="flex items-center justify-center gap-2 shrink-0 text-xs sm:text-sm px-3 py-2">
                  <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="space-y-3 sm:space-y-4">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 sm:h-4 sm:w-4" />
                <Input placeholder="Search student, amount, or transaction..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 sm:pl-10 text-xs sm:text-sm h-9 sm:h-10" />
              </div>

              {/* Submissions Count */}
              

              {/* Load Button or Table */}
              {!loaded ? <div className="text-center py-6 sm:py-8">
                  <Button onClick={() => loadSubmissions()} disabled={loading} className="flex items-center justify-center gap-2 w-full sm:w-auto text-xs sm:text-sm px-4 py-2">
                    <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>{loading ? 'Loading...' : 'Load Submissions'}</span>
                  </Button>
                </div> : <Paper sx={{
              width: '100%',
              overflow: 'hidden',
              height: {
                xs: 'calc(100vh - 400px)',
                sm: 'calc(100vh - 360px)',
                md: 'calc(100vh - 320px)'
              }
            }}>
                  <TableContainer sx={{
                height: 'calc(100% - 52px)',
                overflowX: 'auto'
              }}>
                    <Table stickyHeader aria-label="payment submissions table" sx={{
                  minWidth: {
                    xs: 800,
                    sm: 900
                  }
                }}>
                      <TableHead>
                        <TableRow>
                          {columns.map(column => <TableCell key={column.id} align={column.align} sx={{
                        minWidth: column.minWidth,
                        fontSize: {
                          xs: '0.75rem',
                          sm: '0.875rem'
                        },
                        padding: {
                          xs: '8px',
                          sm: '16px'
                        }
                      }}>
                              {column.label}
                            </TableCell>)}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {filteredSubmissions.length === 0 ? <TableRow>
                            <TableCell colSpan={columns.length} align="center" sx={{
                        py: {
                          xs: 4,
                          sm: 8
                        }
                      }}>
                              <div className="text-center px-4">
                                <FileText className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                                <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mb-1 sm:mb-2">
                                  {searchTerm ? 'No matching submissions found' : 'No submissions found'}
                                </p>
                                <p className="text-gray-400 dark:text-gray-500 text-xs sm:text-sm">
                                  {searchTerm ? 'Try adjusting your search criteria.' : 'Payment submissions will appear here when students submit payments.'}
                                </p>
                              </div>
                            </TableCell>
                          </TableRow> : filteredSubmissions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map(submission => <TableRow hover role="checkbox" tabIndex={-1} key={submission.id}>
                                <TableCell sx={{
                        fontSize: {
                          xs: '0.75rem',
                          sm: '0.875rem'
                        },
                        padding: {
                          xs: '8px',
                          sm: '16px'
                        }
                      }}>{submission.username || 'Unknown User'}</TableCell>
                                <TableCell align="right" sx={{
                        fontSize: {
                          xs: '0.75rem',
                          sm: '0.875rem'
                        },
                        padding: {
                          xs: '8px',
                          sm: '16px'
                        }
                      }}>
                                  Rs {parseFloat(submission.submittedAmount || '0').toLocaleString()}
                                </TableCell>
                                <TableCell sx={{
                        fontSize: {
                          xs: '0.75rem',
                          sm: '0.875rem'
                        },
                        padding: {
                          xs: '8px',
                          sm: '16px'
                        }
                      }}>{submission.transactionId}</TableCell>
                                <TableCell sx={{
                        fontSize: {
                          xs: '0.75rem',
                          sm: '0.875rem'
                        },
                        padding: {
                          xs: '8px',
                          sm: '16px'
                        }
                      }}>
                                  {new Date(submission.paymentDate).toLocaleDateString()}
                                </TableCell>
                                <TableCell sx={{
                        fontSize: {
                          xs: '0.75rem',
                          sm: '0.875rem'
                        },
                        padding: {
                          xs: '8px',
                          sm: '16px'
                        }
                      }}>
                                  <span className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium border ${getStatusColor(submission.status)}`}>
                                    {submission.status}
                                  </span>
                                </TableCell>
                                <TableCell sx={{
                        fontSize: {
                          xs: '0.75rem',
                          sm: '0.875rem'
                        },
                        padding: {
                          xs: '8px',
                          sm: '16px'
                        }
                      }}>
                                  {new Date(submission.uploadedAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell sx={{
                        fontSize: {
                          xs: '0.75rem',
                          sm: '0.875rem'
                        },
                        padding: {
                          xs: '8px',
                          sm: '16px'
                        }
                      }}>
                                  {submission.receiptUrl ? <Button variant="outline" size="sm" onClick={() => {
                                    setSelectedReceiptUrl(submission.receiptUrl);
                                    setReceiptModalOpen(true);
                                  }} className="flex items-center gap-1 text-xs px-2 py-1">
                                      <Eye className="h-3 w-3" />
                                      <span className="hidden sm:inline">View</span>
                                    </Button> : <span className="text-muted-foreground text-xs sm:text-sm">N/A</span>}
                                </TableCell>
                                <TableCell sx={{
                        fontSize: {
                          xs: '0.75rem',
                          sm: '0.875rem'
                        },
                        padding: {
                          xs: '8px',
                          sm: '16px'
                        }
                      }}>
                                  <div className="flex items-center gap-1 sm:gap-2">
                                    {canVerifySubmissions && submission.status === 'PENDING' && <Button onClick={() => setVerifyingSubmission(submission)} className="flex items-center gap-1 text-xs px-2 py-1" size="sm">
                                        <Shield className="h-3 w-3" />
                                        <span className="hidden sm:inline">Verify</span>
                                      </Button>}
                                  </div>
                                </TableCell>
                              </TableRow>)}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination rowsPerPageOptions={[25, 50, 100]} component="div" count={searchTerm ? filteredSubmissions.length : totalCount} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} sx={{
                '.MuiTablePagination-toolbar': {
                  fontSize: {
                    xs: '0.75rem',
                    sm: '0.875rem'
                  },
                  minHeight: {
                    xs: '48px',
                    sm: '52px'
                  }
                },
                '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
                  fontSize: {
                    xs: '0.75rem',
                    sm: '0.875rem'
                  }
                }
              }} />
                </Paper>}
            </div>
          </CardContent>
        </Card>
        
        {/* Verification Dialog */}
        <VerifySubjectPaymentDialog open={!!verifyingSubmission} onOpenChange={open => !open && setVerifyingSubmission(null)} submission={verifyingSubmission} onVerify={handleVerifySubmission} />
        
        {/* Receipt Viewer Modal */}
        <Dialog open={receiptModalOpen} onOpenChange={setReceiptModalOpen}>
          <DialogContent className="max-w-5xl h-[90vh]">
            <DialogHeader>
              <DialogTitle>Payment Receipt</DialogTitle>
            </DialogHeader>
            <div className="w-full h-[calc(90vh-80px)]">
              {selectedReceiptUrl && <PDFViewer url={selectedReceiptUrl} title="Payment Receipt" />}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>;
};
export default PaymentSubmissionsPage;