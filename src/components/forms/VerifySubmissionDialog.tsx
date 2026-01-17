import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { institutePaymentsApi, VerifySubmissionRequest, PaymentSubmission } from '@/api/institutePayments.api';

interface VerifySubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submission: PaymentSubmission | null;
  instituteId: string;
  onSuccess?: () => void;
}

const VerifySubmissionDialog = ({ open, onOpenChange, submission, instituteId, onSuccess }: VerifySubmissionDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<VerifySubmissionRequest>({
    status: 'VERIFIED',
    rejectionReason: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submission) return;

    if (formData.status === 'REJECTED' && !formData.rejectionReason) {
      toast({
        title: "Error",
        description: "Rejection reason is required when rejecting a submission",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Call the specific institute payment verification API
      const response = await institutePaymentsApi.verifySubmissionDetailed(instituteId, submission.id, {
        status: formData.status,
        rejectionReason: formData.rejectionReason || undefined,
        notes: formData.notes || undefined
      });
      
      toast({
        title: "Success",
        description: `Payment submission ${formData.status.toLowerCase()} successfully`,
      });
      onOpenChange(false);
      onSuccess?.();
      // Reset form
      setFormData({
        status: 'VERIFIED',
        rejectionReason: '',
        notes: ''
      });
    } catch (error) {
      console.error('Failed to verify submission:', error);
      toast({
        title: "Error",
        description: "Failed to verify payment submission",
        variant: "destructive",
      });
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
          <h3 className="font-semibold mb-2">Submission Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <p><strong>Submission ID:</strong> {submission.id}</p>
            <p><strong>Amount:</strong> Rs {parseFloat((submission as any).paymentAmount || (submission as any).submittedAmount || '0').toLocaleString()}</p>
            <p><strong>Student:</strong> {(submission as any).studentName || (submission as any).username || '-'}</p>
            <p><strong>Transaction Ref:</strong> {(submission as any).transactionRef || (submission as any).transactionId || '-'}</p>
            <p><strong>Payment Method:</strong> {(submission as any).paymentMethod || '-'}</p>
            <p><strong>Payment Date:</strong> {new Date(submission.paymentDate).toLocaleDateString()}</p>
          </div>
          {((submission as any).remarks || (submission as any).notes) && (
            <div className="mt-2">
              <p className="text-sm"><strong>Remarks:</strong> {(submission as any).remarks || (submission as any).notes}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="status">Verification Decision *</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value: 'VERIFIED' | 'REJECTED') => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="VERIFIED">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Verified</span>
                  </div>
                </SelectItem>
                <SelectItem value="REJECTED">
                  <div className="flex items-center space-x-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span>Rejected</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.status === 'REJECTED' && (
            <div>
              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
              <Textarea
                id="rejectionReason"
                value={formData.rejectionReason}
                onChange={(e) => setFormData(prev => ({ ...prev, rejectionReason: e.target.value }))}
                placeholder="Please provide a reason for rejection..."
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="notes">Admin Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes (visible to the submitter)..."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              variant={formData.status === 'VERIFIED' ? 'default' : 'destructive'}
            >
              {loading ? 'Processing...' : formData.status === 'VERIFIED' ? 'Verify Submission' : 'Reject Submission'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VerifySubmissionDialog;