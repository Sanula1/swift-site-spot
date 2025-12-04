import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, CheckCircle, AlertCircle, Calendar, DollarSign, RefreshCw, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { institutePaymentsApi, PaymentSubmissionsResponse, PaymentSubmission, InstitutePayment } from '@/api/institutePayments.api';
import { useToast } from '@/hooks/use-toast';

interface ViewSubmissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: InstitutePayment | null;
  instituteId: string;
}

const ViewSubmissionsDialog = ({ open, onOpenChange, payment, instituteId }: ViewSubmissionsDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [submissionsData, setSubmissionsData] = useState<PaymentSubmissionsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const loadSubmissions = async () => {
    if (!payment) return;
    
    setLoading(true);
    try {
      const response = await institutePaymentsApi.getPaymentSubmissions(
        instituteId, 
        payment.id, 
        { page: 1, limit: 50, sortBy: 'submissionDate', sortOrder: 'DESC' }
      );
      setSubmissionsData(response);
    } catch (error) {
      console.error('Failed to load submissions:', error);
      toast({
        title: "Error",
        description: "Failed to load payment submissions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load submissions when dialog opens and payment is available
  useEffect(() => {
    if (open && payment) {
      loadSubmissions();
    }
  }, [open, payment]);

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
        return <AlertCircle className="h-4 w-4" />;
      case 'REJECTED':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>Payment Submissions</span>
            </DialogTitle>
            <div className="flex items-center space-x-2">
              <Button 
                onClick={loadSubmissions} 
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {payment && (
            <div className="text-sm text-muted-foreground">
              <p><strong>Payment:</strong> {payment.paymentType}</p>
              <p><strong>Amount:</strong> ₹{payment.amount.toLocaleString()}</p>
              <p><strong>Due Date:</strong> {new Date(payment.dueDate).toLocaleDateString()}</p>
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            {/* Summary Stats */}
            {submissionsData && (
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Submissions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {submissionsData.data.pagination.totalItems}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Verified
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {submissionsData.data.submissions.filter(s => s.status === 'VERIFIED').length}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Pending
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {submissionsData.data.submissions.filter(s => s.status === 'PENDING').length}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Submissions List */}
            {!submissionsData ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg mb-2">
                  {loading ? 'Loading payment submissions...' : 'Click refresh to load submissions'}
                </p>
              </div>
            ) : submissionsData.data.submissions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground text-lg mb-2">
                  No submissions found
                </p>
                <p className="text-muted-foreground">
                  No payment submissions have been made for this payment yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissionsData.data.submissions.map((submission) => (
                  <Card key={submission.id} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <Badge className={`px-3 py-1 ${getStatusColor(submission.status)}`}>
                            {getStatusIcon(submission.status)}
                            <span className="ml-2">{submission.status}</span>
                          </Badge>
                          <div>
                            <h3 className="font-semibold">
                              Submission #{submission.id}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              by {submission.username}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">
                            ₹{submission.submittedAmount.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Transaction ID:</span>
                            <span className="text-sm font-mono">{submission.transactionId}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">User Type:</span>
                            <span className="text-sm">{submission.userType}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Payment Date:</span>
                            <span className="text-sm">
                              {new Date(submission.paymentDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">Uploaded:</span>
                            <span className="text-sm">
                              {new Date(submission.uploadedAt).toLocaleDateString()}
                            </span>
                          </div>
                          {submission.verifiedAt && (
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Verified:</span>
                              <span className="text-sm">
                                {new Date(submission.verifiedAt).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {submission.notes && (
                        <div className="mt-4 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-1">Notes:</p>
                          <p className="text-sm">{submission.notes}</p>
                        </div>
                      )}
                      
                      {submission.rejectionReason && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <p className="text-sm font-medium mb-1 text-red-700 dark:text-red-300">Rejection Reason:</p>
                          <p className="text-sm text-red-700 dark:text-red-300">{submission.rejectionReason}</p>
                        </div>
                      )}

                      {submission.receiptUrl && (
                        <div className="mt-4">
                          <button
                            onClick={() => window.open(submission.receiptUrl, '_blank')}
                            className="text-blue-600 hover:text-blue-800 text-sm underline"
                          >
                            View Receipt
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ViewSubmissionsDialog;