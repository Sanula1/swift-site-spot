import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock,
  RefreshCw,
  Plus,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { enhancedCachedClient } from '@/api/enhancedCachedClient';
import { CACHE_TTL } from '@/config/cacheTTL';
import { useInstituteRole } from '@/hooks/useInstituteRole';

interface PaymentRecord {
  id: string;
  userId: string;
  paymentAmount: string;
  paymentMethod: string;
  paymentReference: string;
  paymentSlipUrl: string | null;
  paymentSlipFilename: string | null;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  paymentDate: string;
  paymentMonth: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

interface PaymentApiResponse {
  payments: PaymentRecord[];
  total: number;
  page: number;
  limit: number;
}

const Payments = () => {
  const { user } = useAuth();
  const userRole = useInstituteRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [allPayments, setAllPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'VERIFIED' | 'REJECTED'>('PENDING');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Load all payment history from API
  const loadPaymentHistory = async (showToast = true, forceRefresh = false) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "No user ID available",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '100'
      });
      
      const data: PaymentApiResponse = await enhancedCachedClient.get(
        `/payment/my-payments?${params}`,
        {},
        {
          ttl: CACHE_TTL.PAYMENTS,
          forceRefresh,
          userId: user?.id,
          role: userRole
        }
      );
      
      console.log('Payment API Response:', data);
      
      setAllPayments(data.payments);
      filterPaymentsByStatus(data.payments, activeTab);
      
      if (showToast) {
        toast({
          title: "Data Loaded",
          description: `Successfully loaded ${data.payments.length} payment records.`
        });
      }
    } catch (error) {
      console.error('Error loading payment history:', error);
      if (showToast) {
        toast({
          title: "Error",
          description: "Failed to load payment history",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-load payment history on mount (uses cache if available)
  useEffect(() => {
    if (user?.id) {
      loadPaymentHistory(false, false); // Load from cache, no toast
    }
  }, [user?.id]);

  // Filter payments by status on frontend
  const filterPaymentsByStatus = (currentPayments: PaymentRecord[], status: 'PENDING' | 'VERIFIED' | 'REJECTED') => {
    const filteredPayments = currentPayments.filter(payment => payment.status === status);
    setPayments(filteredPayments);
  };

  // Handle tab change
  const handleTabChange = (tab: 'PENDING' | 'VERIFIED' | 'REJECTED') => {
    setActiveTab(tab);
    setPage(0);
    filterPaymentsByStatus(allPayments, tab);
  };

  // Handle pagination changes
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const getStatusBadge = (status: PaymentRecord['status']) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Verified
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: string) => {
    return `Rs ${parseFloat(amount).toLocaleString()}`;
  };

  const handleViewSlip = (payment: PaymentRecord) => {
    if (payment.paymentSlipUrl) {
      window.open(payment.paymentSlipUrl, '_blank');
      toast({
        title: "Opening Payment Slip",
        description: `Payment slip for ${payment.paymentReference} is being opened.`,
      });
    }
  };

  const handleNewPayment = () => {
    navigate('/system-payments/create');
  };


  return (
    <AppLayout currentPage="system-payment">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CreditCard className="h-8 w-8" />
              Payment History
            </h1>
            <p className="text-muted-foreground">
              View your payment transactions and download invoices
            </p>
          </div>
        </div>

        {/* Header Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatAmount(
                  allPayments.filter(p => p.status === 'VERIFIED').reduce((sum, p) => sum + parseFloat(p.paymentAmount), 0).toString()
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Verified Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {allPayments.filter(p => p.status === 'VERIFIED').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {allPayments.filter(p => p.status === 'PENDING').length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Rejected Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {allPayments.filter(p => p.status === 'REJECTED').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <Button
            onClick={handleNewPayment}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Payment
          </Button>
          
          <Button
            onClick={() => loadPaymentHistory(true, true)} // Force refresh from backend with toast
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Payment Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => handleTabChange(value as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="PENDING" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Pending</span>
              <span className="sm:hidden">P</span>
              <span className="ml-1">({allPayments.filter(p => p.status === 'PENDING').length})</span>
            </TabsTrigger>
            <TabsTrigger value="VERIFIED" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Verified</span>
              <span className="sm:hidden">V</span>
              <span className="ml-1">({allPayments.filter(p => p.status === 'VERIFIED').length})</span>
            </TabsTrigger>
            <TabsTrigger value="REJECTED" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Rejected</span>
              <span className="sm:hidden">R</span>
              <span className="ml-1">({allPayments.filter(p => p.status === 'REJECTED').length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <Paper sx={{ width: '100%', overflow: 'hidden', height: 'calc(100vh - 320px)' }}>
              <TableContainer sx={{ height: 'calc(100% - 52px)' }}>
                <Table stickyHeader aria-label="payment submissions table">
                  <TableHead>
                    <TableRow>
                      <TableCell style={{ minWidth: 120 }}>Amount</TableCell>
                      <TableCell style={{ minWidth: 150 }}>Reference</TableCell>
                      <TableCell style={{ minWidth: 120 }}>Method</TableCell>
                      <TableCell style={{ minWidth: 150 }}>Payment Date</TableCell>
                      <TableCell style={{ minWidth: 100 }}>Month</TableCell>
                      <TableCell style={{ minWidth: 120 }}>Status</TableCell>
                      <TableCell style={{ minWidth: 200 }}>Notes</TableCell>
                      <TableCell style={{ minWidth: 200 }}>Rejection Reason</TableCell>
                      <TableCell style={{ minWidth: 120 }}>Slip</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments
                      .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                      .map((payment) => (
                        <TableRow hover role="checkbox" tabIndex={-1} key={payment.id}>
                          <TableCell>{formatAmount(payment.paymentAmount)}</TableCell>
                          <TableCell>
                            <span className="font-mono text-xs">{payment.paymentReference}</span>
                          </TableCell>
                          <TableCell>{payment.paymentMethod?.replace('_', ' ') || '-'}</TableCell>
                          <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                          <TableCell>{payment.paymentMonth}</TableCell>
                          <TableCell>{getStatusBadge(payment.status)}</TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600 truncate block max-w-[200px]" title={payment.notes}>
                              {payment.notes || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-red-600 truncate block max-w-[200px]" title={payment.rejectionReason || ''}>
                              {payment.rejectionReason || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {payment.paymentSlipUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewSlip(payment)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                rowsPerPageOptions={[10, 25, 50, 100]}
                component="div"
                count={payments.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
              />
            </Paper>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Payments;