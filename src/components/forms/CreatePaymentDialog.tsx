import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { institutePaymentsApi, CreatePaymentRequest } from '@/api/institutePayments.api';

interface CreatePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instituteId: string;
  onSuccess?: () => void;
}

const CreatePaymentDialog = ({ open, onOpenChange, instituteId, onSuccess }: CreatePaymentDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreatePaymentRequest>({
    paymentType: '',
    description: '',
    amount: 0,
    dueDate: '',
    targetType: 'STUDENTS',
    priority: 'MANDATORY',
    paymentInstructions: '',
    bankDetails: {
      bankName: '',
      accountNumber: '',
      accountHolderName: '',
      branch: ''
    },
    lateFeeAmount: 0,
    lateFeeAfterDays: 5,
    reminderDaysBefore: 3
  });

  const handleInputChange = (field: keyof CreatePaymentRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleBankDetailsChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      bankDetails: {
        ...prev.bankDetails!,
        [field]: value
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.paymentType || !formData.description || formData.amount <= 0 || !formData.dueDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Clean up bankDetails - only include if has meaningful data, exclude ifscCode
      const cleanedBankDetails = formData.bankDetails && 
        (formData.bankDetails.bankName || formData.bankDetails.accountNumber || formData.bankDetails.accountHolderName || formData.bankDetails.branch)
        ? {
            bankName: formData.bankDetails.bankName || '',
            accountNumber: formData.bankDetails.accountNumber || '',
            accountHolderName: formData.bankDetails.accountHolderName || '',
            branch: formData.bankDetails.branch || '',
          }
        : undefined;

      const payload = {
        ...formData,
        bankDetails: cleanedBankDetails,
      };

      await institutePaymentsApi.createPayment(instituteId, payload);
      toast({
        title: "Success",
        description: "Payment created successfully",
      });
      onOpenChange(false);
      onSuccess?.();
      // Reset form
      setFormData({
        paymentType: '',
        description: '',
        amount: 0,
        dueDate: '',
        targetType: 'STUDENTS',
        priority: 'MANDATORY',
        paymentInstructions: '',
        bankDetails: {
          bankName: '',
          accountNumber: '',
          accountHolderName: '',
          branch: ''
        },
        lateFeeAmount: 0,
        lateFeeAfterDays: 5,
        reminderDaysBefore: 3
      });
    } catch (error) {
      console.error('Failed to create payment:', error);
      toast({
        title: "Error",
        description: "Failed to create payment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Payment</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentType">Payment Type *</Label>
                  <Input
                    id="paymentType"
                    value={formData.paymentType}
                    onChange={(e) => handleInputChange('paymentType', e.target.value)}
                    placeholder="e.g., Tuition Fee"
                  />
                </div>
                <div>
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe the payment purpose"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input
                    id="dueDate"
                    type="datetime-local"
                    value={formData.dueDate}
                    onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="targetType">Target Type</Label>
                  <Select value={formData.targetType} onValueChange={(value) => handleInputChange('targetType', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STUDENTS">Students</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANDATORY">Mandatory</SelectItem>
                      <SelectItem value="OPTIONAL">Optional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card>
            <CardHeader>
              <CardTitle>Bank Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={formData.bankDetails?.bankName || ''}
                    onChange={(e) => handleBankDetailsChange('bankName', e.target.value)}
                    placeholder="National Education Bank"
                  />
                </div>
                <div>
                  <Label htmlFor="accountHolderName">Account Holder Name</Label>
                  <Input
                    id="accountHolderName"
                    value={formData.bankDetails?.accountHolderName || ''}
                    onChange={(e) => handleBankDetailsChange('accountHolderName', e.target.value)}
                    placeholder="Springfield High School"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input
                    id="accountNumber"
                    value={formData.bankDetails?.accountNumber || ''}
                    onChange={(e) => handleBankDetailsChange('accountNumber', e.target.value)}
                    placeholder="1234567890"
                  />
                </div>
                <div>
                  <Label htmlFor="branch">Branch (Bank Branch)</Label>
                  <Input
                    id="branch"
                    value={formData.bankDetails?.branch || ''}
                    onChange={(e) => handleBankDetailsChange('branch', e.target.value)}
                    placeholder="Main Branch"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="paymentInstructions">Payment Instructions</Label>
                <Textarea
                  id="paymentInstructions"
                  value={formData.paymentInstructions || ''}
                  onChange={(e) => handleInputChange('paymentInstructions', e.target.value)}
                  placeholder="Please transfer the amount to the bank account listed below..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="lateFeeAmount">Late Fee Amount</Label>
                  <Input
                    id="lateFeeAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.lateFeeAmount || 0}
                    onChange={(e) => handleInputChange('lateFeeAmount', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="lateFeeAfterDays">Late Fee After Days</Label>
                  <Input
                    id="lateFeeAfterDays"
                    type="number"
                    min="0"
                    value={formData.lateFeeAfterDays || 5}
                    onChange={(e) => handleInputChange('lateFeeAfterDays', parseInt(e.target.value) || 5)}
                  />
                </div>
                <div>
                  <Label htmlFor="reminderDaysBefore">Reminder Days Before</Label>
                  <Input
                    id="reminderDaysBefore"
                    type="number"
                    min="0"
                    value={formData.reminderDaysBefore || 3}
                    onChange={(e) => handleInputChange('reminderDaysBefore', parseInt(e.target.value) || 3)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreatePaymentDialog;