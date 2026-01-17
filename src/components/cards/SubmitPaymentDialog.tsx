/**
 * SubmitPaymentDialog - Submit payment for an order
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Upload, CreditCard, Loader2, Link as LinkIcon, Receipt } from 'lucide-react';
import { UserIdCardOrder, PaymentType, userCardApi } from '@/api/userCard.api';
import { formatPrice } from '@/utils/cardHelpers';
import { toast } from '@/hooks/use-toast';
import { z } from 'zod';

interface SubmitPaymentDialogProps {
  order: UserIdCardOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadingOrder?: boolean;
  onSuccess: () => void;
}

const paymentSchema = z.object({
  submissionUrl: z.string().url('Please enter a valid URL'),
  paymentType: z.enum([PaymentType.SLIP_UPLOAD, PaymentType.VISA_MASTER]),
  paymentAmount: z.number().positive('Amount must be positive'),
  paymentReference: z.string().optional(),
});

const SubmitPaymentDialog: React.FC<SubmitPaymentDialogProps> = ({
  order,
  open,
  onOpenChange,
  loadingOrder = false,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    submissionUrl: '',
    paymentType: PaymentType.SLIP_UPLOAD,
    paymentReference: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!order) return;

    const paymentAmount = order.card?.price;
    if (!paymentAmount || paymentAmount <= 0) {
      toast({
        title: 'Order not ready',
        description: 'Order details are still loading. Please wait a moment and try again.',
        variant: 'destructive',
      });
      return;
    }

    // Validate
    const result = paymentSchema.safeParse({
      ...formData,
      paymentAmount,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    try {
      setLoading(true);
      await userCardApi.submitPayment(order.id, {
        submissionUrl: formData.submissionUrl.trim(),
        paymentType: formData.paymentType,
        paymentAmount,
        paymentReference: formData.paymentReference.trim() || undefined,
      });

      toast({
        title: 'Payment Submitted',
        description: 'Your payment has been submitted for verification.',
      });

      // Reset form
      setFormData({
        submissionUrl: '',
        paymentType: PaymentType.SLIP_UPLOAD,
        paymentReference: '',
      });
      setErrors({});
      onSuccess();
    } catch (error: any) {
      console.error('Error submitting payment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit payment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Submit Payment
          </DialogTitle>
          <DialogDescription>
            Submit your payment details for order #{order.id}
          </DialogDescription>
        </DialogHeader>

        {/* Order Summary */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          {loadingOrder ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Card</span>
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Amount Due</span>
                <Skeleton className="h-7 w-24" />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Card</span>
                <span className="font-medium">{order.card?.cardName || '-'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Amount Due</span>
                <span className="text-xl font-bold text-primary">
                  {order.card ? formatPrice(order.card.price) : '-'}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Form */}
        <div className="space-y-4 py-4">
          {/* Payment Type */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <RadioGroup
              value={formData.paymentType}
              onValueChange={(value) => handleInputChange('paymentType', value)}
              className="grid grid-cols-2 gap-4"
            >
              <div>
                <RadioGroupItem
                  value={PaymentType.SLIP_UPLOAD}
                  id="slip"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="slip"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Receipt className="mb-3 h-6 w-6" />
                  <span className="text-sm font-medium">Bank Slip</span>
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value={PaymentType.VISA_MASTER}
                  id="card"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="card"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <CreditCard className="mb-3 h-6 w-6" />
                  <span className="text-sm font-medium">Card Payment</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Payment Proof URL */}
          <div className="space-y-2">
            <Label htmlFor="submissionUrl" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              {formData.paymentType === PaymentType.SLIP_UPLOAD
                ? 'Payment Slip URL'
                : 'Transaction Screenshot URL'}
            </Label>
            <Input
              id="submissionUrl"
              placeholder="https://example.com/payment-slip.jpg"
              value={formData.submissionUrl}
              onChange={(e) => handleInputChange('submissionUrl', e.target.value)}
              className={errors.submissionUrl ? 'border-red-500' : ''}
            />
            {errors.submissionUrl && (
              <p className="text-sm text-red-500">{errors.submissionUrl}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Upload your payment proof to a file hosting service and paste the URL here.
            </p>
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="paymentReference" className="flex items-center gap-2">
              Reference Number (Optional)
            </Label>
            <Input
              id="paymentReference"
              placeholder="REF123456789"
              value={formData.paymentReference}
              onChange={(e) => handleInputChange('paymentReference', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || loadingOrder || !order.card?.price}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Payment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SubmitPaymentDialog;
