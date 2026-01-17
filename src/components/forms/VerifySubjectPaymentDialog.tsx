import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, User, Calendar, DollarSign, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { SubjectPaymentSubmission } from '@/api/subjectPayments.api';
import { getImageUrl } from '@/utils/imageUrlHelper';

interface VerifySubjectPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: SubjectPaymentSubmission | null;
  onVerify: (status: 'VERIFIED' | 'REJECTED', rejectionReason?: string, notes?: string) => Promise<void>;
}

const VerifySubjectPaymentDialog = ({ open, onOpenChange, submission, onVerify }: VerifySubjectPaymentDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'VERIFIED' | 'REJECTED'>('VERIFIED');
  const [rejectionReason, setRejectionReason] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submission) return;

    if (status === 'REJECTED' && !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Rejection reason is required when rejecting a submission",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await onVerify(status, rejectionReason || undefined, notes || undefined);
      
      // Reset form
      setStatus('VERIFIED');
      setRejectionReason('');
      setNotes('');
    } catch (error) {
      console.error('Failed to verify submission:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!submission) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Verify Payment Submission</DialogTitle>
        </DialogHeader>
        
        {/* Submission Details */}
        <div className="bg-muted p-4 rounded-lg mb-6">
          <h3 className="font-semibold mb-3">Submission Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span><strong>Submitter:</strong> {submission.username || 'Unknown User'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span><strong>Amount:</strong> Rs {submission.submittedAmount ? parseFloat(submission.submittedAmount.toString()).toLocaleString() : '0'}</span>
            </div>
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span><strong>User Type:</strong> {submission.userType}</span>
            </div>
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span><strong>Transaction ID:</strong> {submission.transactionId}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span><strong>Payment Date:</strong> {new Date(submission.paymentDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span><strong>Submitted:</strong> {new Date(submission.uploadedAt).toLocaleDateString()}</span>
            </div>
          </div>
          {submission.notes && (
            <div className="mt-3 p-2 bg-background rounded border">
              <p className="text-sm"><strong>Notes:</strong> {submission.notes}</p>
            </div>
          )}
          {submission.receiptUrl && (
            <div className="mt-3">
              <a 
                target="_blank"
                rel="noopener noreferrer"
                href={getImageUrl(submission.receiptUrl)}
                className="text-primary hover:underline text-sm"
              >
                View Receipt
              </a>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="status">Verification Status</Label>
            <Select value={status} onValueChange={(value: 'VERIFIED' | 'REJECTED') => setStatus(value)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VERIFIED">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    Verify
                  </div>
                </SelectItem>
                <SelectItem value="REJECTED">
                  <div className="flex items-center">
                    <XCircle className="h-4 w-4 mr-2 text-red-500" />
                    Reject
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {status === 'REJECTED' && (
            <div>
              <Label htmlFor="rejectionReason">
                Rejection Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a reason for rejection"
                rows={3}
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional comments or observations"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || (status === 'REJECTED' && !rejectionReason.trim())}
            >
              {loading ? 'Processing...' : status === 'VERIFIED' ? 'Verify Submission' : 'Reject Submission'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VerifySubjectPaymentDialog;
