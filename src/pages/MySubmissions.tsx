import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, CheckCircle, Calendar, DollarSign, Clock, XCircle, Eye, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { institutePaymentsApi, MyPaymentSubmission, MySubmissionsResponse } from '@/api/institutePayments.api';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import MUITable from '@/components/ui/mui-table';
import { getImageUrl } from '@/utils/imageUrlHelper';

const MySubmissions = () => {
  const { selectedInstitute } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('PENDING');
  const [loading, setLoading] = useState(false);
  const [submissionsData, setSubmissionsData] = useState<MySubmissionsResponse | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // Remove auto-load on mount, only load when refresh is clicked

  const loadSubmissions = async () => {
    if (!selectedInstitute?.id) return;
    
    setLoading(true);
    try {
      const response = await institutePaymentsApi.getMySubmissions(selectedInstitute.id);
      setSubmissionsData(response);
      
      toast({
        title: "Success",
        description: "Submissions loaded successfully",
      });
    } catch (error) {
      console.error('Failed to load submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load your submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter submissions by status on frontend
  const getFilteredSubmissions = (status: string) => {
    if (!submissionsData) return [];
    return submissionsData.data.submissions.filter(submission => submission.status === status);
  };

  const getStatusBadge = (status: string) => {
    const icons = {
      'VERIFIED': <CheckCircle className="h-4 w-4" />,
      'PENDING': <Clock className="h-4 w-4" />,
      'REJECTED': <XCircle className="h-4 w-4" />
    };
    
    const colors = {
      'VERIFIED': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300',
      'PENDING': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300',
      'REJECTED': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-300'
    };

    return (
      <Badge className={colors[status] || 'bg-gray-100 text-gray-800'}>
        <div className="flex items-center space-x-1">
          {icons[status]}
          <span>{status}</span>
        </div>
      </Badge>
    );
  };

  const getTabIcon = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <CheckCircle className="h-4 w-4" />;
      case 'PENDING':
        return <Clock className="h-4 w-4" />;
      case 'REJECTED':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Define table columns
  const getColumns = () => [
    {
      id: 'paymentType',
      label: 'Payment Type',
      minWidth: 150,
      format: (value: string) => value || '-'
    },
    {
      id: 'description',
      label: 'Description',
      minWidth: 200,
      format: (value: string) => value || '-'
    },
    {
      id: 'priority',
      label: 'Priority',
      minWidth: 100,
      format: (value: string) => (
        <Badge variant={value === 'MANDATORY' ? 'destructive' : 'secondary'}>
          {value}
        </Badge>
      )
    },
    {
      id: 'paymentAmount',
      label: 'Amount',
      minWidth: 120,
      align: 'right' as const,
      format: (value: number) => `Rs ${value.toLocaleString()}`
    },
    {
      id: 'totalAmountPaid',
      label: 'Total Paid',
      minWidth: 120,
      align: 'right' as const,
      format: (value: number) => `Rs ${value.toLocaleString()}`
    },
    {
      id: 'lateFeeApplied',
      label: 'Late Fee',
      minWidth: 100,
      align: 'right' as const,
      format: (value: number) => value > 0 ? `Rs ${value.toLocaleString()}` : '-'
    },
    {
      id: 'paymentMethod',
      label: 'Method',
      minWidth: 120,
      format: (value: string) => value?.replace('_', ' ') || '-'
    },
    {
      id: 'transactionReference',
      label: 'Transaction ID',
      minWidth: 150,
      format: (value: string) => value || '-'
    },
    {
      id: 'dueDate',
      label: 'Due Date',
      minWidth: 130,
      format: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      id: 'paymentDate',
      label: 'Payment Date',
      minWidth: 130,
      format: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      id: 'createdAt',
      label: 'Submitted',
      minWidth: 130,
      format: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      id: 'verifiedAt',
      label: 'Verified',
      minWidth: 130,
      format: (value: string) => value ? new Date(value).toLocaleDateString() : '-'
    },
    {
      id: 'daysSinceSubmission',
      label: 'Days Since',
      minWidth: 100,
      align: 'center' as const,
      format: (value: number) => `${value} days`
    },
    {
      id: 'paymentRemarks',
      label: 'Remarks',
      minWidth: 150,
      format: (value: string) => value || '-'
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 120,
      align: 'center' as const,
      format: (value: string) => getStatusBadge(value)
    },
    {
      id: 'receiptFileUrl',
      label: 'Receipt',
      minWidth: 100,
      align: 'center' as const,
      format: (value: string) => value ? (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => window.open(getImageUrl(value), '_blank')}
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      ) : '-'
    }
  ];

  const handleViewDetails = (submission: MyPaymentSubmission) => {
    // Could open a dialog with more details
    console.log('View details for submission:', submission);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleRowsPerPageChange = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(0);
  };

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Submissions</h1>
            {selectedInstitute && (
              <p className="text-muted-foreground mt-1">
                Institute: {selectedInstitute.name}
              </p>
            )}
          </div>
          <Button onClick={loadSubmissions} disabled={loading} variant="outline">
            {loading ? (
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

        {/* Summary Stats */}
        {submissionsData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{submissionsData.data.summary.totalSubmissions}</p>
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
                    <p className="text-2xl font-bold">{submissionsData.data.summary.byStatus.pending}</p>
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
                    <p className="text-2xl font-bold">{submissionsData.data.summary.byStatus.verified}</p>
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
                    <p className="text-2xl font-bold">{submissionsData.data.summary.byStatus.rejected}</p>
                    <p className="text-sm text-muted-foreground">Rejected</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Submissions Tabs */}
        {!submissionsData ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg mb-2">
              {loading ? 'Loading your payment submissions...' : 'Click "Refresh" to view your payment submissions'}
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="PENDING" className="flex items-center space-x-2">
                {getTabIcon('PENDING')}
                <span>Pending ({submissionsData.data.summary.byStatus.pending})</span>
              </TabsTrigger>
              <TabsTrigger value="VERIFIED" className="flex items-center space-x-2">
                {getTabIcon('VERIFIED')}
                <span>Verified ({submissionsData.data.summary.byStatus.verified})</span>
              </TabsTrigger>
              <TabsTrigger value="REJECTED" className="flex items-center space-x-2">
                {getTabIcon('REJECTED')}
                <span>Rejected ({submissionsData.data.summary.byStatus.rejected})</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="PENDING" className="mt-6">
              <MUITable
                title="Pending Submissions"
                columns={getColumns()}
                data={getFilteredSubmissions('PENDING')}
                page={page}
                rowsPerPage={rowsPerPage}
                totalCount={getFilteredSubmissions('PENDING').length}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
                rowsPerPageOptions={[25, 50, 100]}
                allowAdd={false}
                allowEdit={false}
                allowDelete={false}
              />
            </TabsContent>
            
            <TabsContent value="VERIFIED" className="mt-6">
              <MUITable
                title="Verified Submissions"
                columns={getColumns()}
                data={getFilteredSubmissions('VERIFIED')}
                page={page}
                rowsPerPage={rowsPerPage}
                totalCount={getFilteredSubmissions('VERIFIED').length}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
                rowsPerPageOptions={[25, 50, 100]}
                allowAdd={false}
                allowEdit={false}
                allowDelete={false}
              />
            </TabsContent>
            
            <TabsContent value="REJECTED" className="mt-6">
              <MUITable
                title="Rejected Submissions"
                columns={getColumns()}
                data={getFilteredSubmissions('REJECTED')}
                page={page}
                rowsPerPage={rowsPerPage}
                totalCount={getFilteredSubmissions('REJECTED').length}
                onPageChange={handlePageChange}
                onRowsPerPageChange={handleRowsPerPageChange}
                rowsPerPageOptions={[25, 50, 100]}
                allowAdd={false}
                allowEdit={false}
                allowDelete={false}
              />
            </TabsContent>
          </Tabs>
        )}
    </div>
  );
};

export default MySubmissions;