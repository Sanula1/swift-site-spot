import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { transportApi } from '@/api/transport.api';
import { toast } from 'sonner';

interface EnrollTransportDialogProps {
  studentId: string;
  onEnrollmentSuccess: () => void;
}

const EnrollTransportDialog: React.FC<EnrollTransportDialogProps> = ({ 
  studentId, 
  onEnrollmentSuccess 
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    bookhireId: '',
    pickupLocation: '',
    dropoffLocation: '',
    monthlyFee: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.bookhireId || !formData.pickupLocation || !formData.dropoffLocation) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await transportApi.enrollTransport({
        studentId,
        bookhireId: parseInt(formData.bookhireId),
        pickupLocation: formData.pickupLocation,
        dropoffLocation: formData.dropoffLocation,
        monthlyFee: parseFloat(formData.monthlyFee) || 0
      });

      toast.success('Successfully enrolled in transport service');
      setOpen(false);
      setFormData({
        bookhireId: '',
        pickupLocation: '',
        dropoffLocation: '',
        monthlyFee: ''
      });
      onEnrollmentSuccess();
    } catch (error) {
      console.error('Failed to enroll in transport:', error);
      toast.error('Failed to enroll in transport service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Enroll Transport
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Enroll in Transport Service</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bookhireId">
              Bookhire ID <span className="text-destructive">*</span>
            </Label>
            <Input
              id="bookhireId"
              type="number"
              value={formData.bookhireId}
              onChange={(e) => setFormData({ ...formData, bookhireId: e.target.value })}
              placeholder="Enter bookhire ID"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickupLocation">
              Pickup Location <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pickupLocation"
              value={formData.pickupLocation}
              onChange={(e) => setFormData({ ...formData, pickupLocation: e.target.value })}
              placeholder="Enter pickup location"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dropoffLocation">
              Drop-off Location <span className="text-destructive">*</span>
            </Label>
            <Input
              id="dropoffLocation"
              value={formData.dropoffLocation}
              onChange={(e) => setFormData({ ...formData, dropoffLocation: e.target.value })}
              placeholder="Enter drop-off location"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthlyFee">Monthly Fee (LKR)</Label>
            <Input
              id="monthlyFee"
              type="number"
              step="0.01"
              value={formData.monthlyFee}
              onChange={(e) => setFormData({ ...formData, monthlyFee: e.target.value })}
              placeholder="Enter monthly fee"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Enrolling...' : 'Enroll'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EnrollTransportDialog;
