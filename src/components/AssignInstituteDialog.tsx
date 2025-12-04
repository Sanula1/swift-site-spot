
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { organizationSpecificApi } from '@/api/organization.api';
import { useToast } from '@/hooks/use-toast';

interface AssignInstituteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

const AssignInstituteDialog = ({ open, onOpenChange, organizationId }: AssignInstituteDialogProps) => {
  const [instituteId, setInstituteId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!instituteId.trim()) {
      toast({
        title: "Validation Error",
        description: "Institute ID is required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await organizationSpecificApi.put(
        `/organization/api/v1/organizations/${organizationId}/assign-institute`,
        { instituteId: instituteId.trim() }
      );
      
      toast({
        title: "Success",
        description: "Organization successfully assigned to institute",
      });
      
      setInstituteId('');
      onOpenChange(false);
    } catch (error) {
      console.error('Error assigning institute:', error);
      toast({
        title: "Error",
        description: "Failed to assign organization to institute",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign to Institute</DialogTitle>
          <DialogDescription>
            Assign this organization to an institute by providing the institute ID.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="instituteId">Institute ID</Label>
              <Input
                id="instituteId"
                placeholder="Enter institute ID"
                value={instituteId}
                onChange={(e) => setInstituteId(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AssignInstituteDialog;
