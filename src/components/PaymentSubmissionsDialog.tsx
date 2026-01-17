import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, Download, CheckCircle, Clock, XCircle, User, Calendar, FileText, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { subjectPaymentsApi, SubjectPaymentSubmission } from '@/api/subjectPayments.api';
import { getImageUrl } from '@/utils/imageUrlHelper';

interface PaymentSubmissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string;
  paymentTitle: string;
}

const PaymentSubmissionsDialog: React.FC<PaymentSubmissionsDialogProps> = ({
  open,
  onOpenChange,
  paymentId,
  paymentTitle
}) => {
  const { toast } = useToast();
  const [submissions, setSubmissions] = useState<SubjectPaymentSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadSubmissions = async () => {
    if (loading || loaded) return;
    
    setLoading(true);
    try {
      const response = await subjectPaymentsApi.getPaymentSubmissions(paymentId);
      setSubmissions(response.data);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200';
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
        return <FileText className="h-4 w-4" />;
    }
  };

  const handleDialogOpenChange = (newOpen: boolean) => {
    if (newOpen && !loaded) {
      loadSubmissions();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-base sm:text-lg">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>Payment Submissions</span>
          </DialogTitle>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Viewing submissions for: {paymentTitle}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {!loaded ? (
            <div className="flex justify-center py-4 sm:py-8">
              <Button 
                onClick={loadSubmissions}
                disabled={loading}
                className="flex items-center space-x-2 text-sm sm:text-base"
                size="sm"
              >
                <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>{loading ? 'Loading...' : 'Load Submissions'}</span>
              </Button>
            </div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-8 sm:py-12 px-4">
              <FileText className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg mb-2">
                No submissions found
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm sm:text-base">
                Payment submissions will appear here when students submit payments.
              </p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {submissions.map((submission) => (
                <Card key={submission.id} className="border border-gray-200 dark:border-gray-700">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex flex-col space-y-3">
                      {/* Header with user and status */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                          <div className="flex items-center space-x-2">
                            <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                            <span className="font-medium text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">
                              {submission.submitterName || 'Unknown User'}
                            </span>
                          </div>
                          <Badge className={`${getStatusColor(submission.status)} w-fit`}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(submission.status)}
                              <span className="text-xs sm:text-sm">{submission.status}</span>
                            </div>
                          </Badge>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">
                            Rs {parseFloat(submission.paymentAmount.toString()).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Payment details */}
                      <div className="grid grid-cols-1 gap-3 text-xs sm:text-sm">
                        <div className="space-y-2">
                          <div className="flex items-start space-x-2">
                            <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                            <span className="text-gray-600 dark:text-gray-400 break-all">
                              <strong>Transaction ID:</strong> {submission.transactionReference}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-400">
                              <strong>Payment Date:</strong> {new Date(submission.paymentDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-400">
                              <strong>Method:</strong> {submission.paymentMethod}
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-400">
                              <strong>Submitted:</strong> {new Date(submission.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {submission.verifiedAt && (
                            <div className="flex items-center space-x-2">
                              <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                              <span className="text-gray-600 dark:text-gray-400">
                                <strong>Verified:</strong> {new Date(submission.verifiedAt).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          {submission.verifierName && (
                            <div className="flex items-center space-x-2">
                              <User className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 flex-shrink-0" />
                              <span className="text-gray-600 dark:text-gray-400 break-all">
                                <strong>Verified by:</strong> {submission.verifierName}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Notes and rejection reason */}
                      {submission.notes && (
                        <div className="bg-gray-50 dark:bg-gray-800 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-words">
                            <strong>Notes:</strong> {submission.notes}
                          </p>
                        </div>
                      )}

                      {submission.rejectionReason && (
                        <div className="bg-red-50 dark:bg-red-900/20 p-2 sm:p-3 rounded-lg">
                          <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 break-words">
                            <strong>Rejection Reason:</strong> {submission.rejectionReason}
                          </p>
                        </div>
                      )}

                      {/* Receipt download */}
                      {submission.receiptFileUrl && (
                        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(getImageUrl(submission.receiptFileUrl), '_blank')}
                            className="flex items-center justify-center space-x-1 w-full sm:w-auto text-xs sm:text-sm"
                          >
                            <Download className="h-3 w-3" />
                            <span>Download Receipt</span>
                          </Button>
                          {submission.receiptFileName && (
                            <span className="text-xs text-gray-500 truncate">
                              {submission.receiptFileName}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PaymentSubmissionsDialog;