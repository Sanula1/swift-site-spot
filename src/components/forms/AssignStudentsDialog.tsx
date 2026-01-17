import React, { useState, useEffect } from 'react';
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
import { UserPlus, Loader2, Plus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { instituteClassesApi, BulkAssignStudentsData } from '@/api/instituteClasses.api';
import { useInstituteRole } from '@/hooks/useInstituteRole';
import { Badge } from '@/components/ui/badge';


interface AssignStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssignmentComplete: () => void;
}

const AssignStudentsDialog: React.FC<AssignStudentsDialogProps> = ({
  open,
  onOpenChange,
  onAssignmentComplete
}) => {
  const { selectedInstitute, selectedClass } = useAuth();
  const instituteRole = useInstituteRole();
  const { toast } = useToast();
  
  // Check permissions - InstituteAdmin and Teacher only
  const hasPermission = instituteRole === 'InstituteAdmin' || instituteRole === 'Teacher';
  
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userIds, setUserIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  const handleAddUserId = () => {
    const trimmedId = currentUserId.trim();
    if (trimmedId && !userIds.includes(trimmedId)) {
      setUserIds([...userIds, trimmedId]);
      setCurrentUserId('');
    }
  };

  const handleRemoveUserId = (idToRemove: string) => {
    setUserIds(userIds.filter(id => id !== idToRemove));
  };

  const handleAssignStudents = async () => {
    if (!selectedClass?.id || !selectedInstitute?.id || userIds.length === 0) {
      toast({
        title: "Error",
        description: "Please enter at least one user ID",
        variant: "destructive"
      });
      return;
    }

    setAssigning(true);
    try {
      const assignData: BulkAssignStudentsData = {
        studentUserIds: userIds,
        skipVerification: true,
        assignmentNotes: "Batch assignment by user IDs"
      };
      
      const result = await instituteClassesApi.teacherAssignStudents(
        selectedInstitute.id, 
        selectedClass.id, 
        assignData
      );
      
      if (result && result.success) {
        const successCount = result.success.length;
        const failedCount = result.failed.length;
        
        if (failedCount === 0) {
          toast({
            title: "Success!",
            description: `Successfully assigned ${successCount} student(s) to ${selectedClass.name}`
          });
          
          onAssignmentComplete();
          onOpenChange(false);
          setUserIds([]);
          setCurrentUserId('');
        } else if (successCount > 0) {
          toast({
            title: "Partial Success",
            description: `${successCount} students assigned successfully, ${failedCount} failed`,
          });
          
          onAssignmentComplete();
          onOpenChange(false);
          setUserIds([]);
          setCurrentUserId('');
        } else {
          toast({
            title: "Assignment Failed",
            description: "Failed to assign all users to the class",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Assignment Complete",
          description: "Users have been assigned to the class"
        });
        
        onAssignmentComplete();
        onOpenChange(false);
        setUserIds([]);
        setCurrentUserId('');
      }
    } catch (error: any) {
      console.error('Error assigning students:', error);
      
      let errorMessage = "Failed to assign users to the class";
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (errorData.message && typeof errorData.message === 'string') {
          errorMessage = errorData.message;
        } else if (errorData.details?.message) {
          errorMessage = errorData.details.message;
        } else if (errorData.error) {
          errorMessage = `${errorData.error}: ${errorData.message || 'Unknown error'}`;
        }
        
        if (errorData.statusCode) {
          errorMessage = `[${errorData.statusCode}] ${errorMessage}`;
        }
      }
      
      toast({
        title: "Assignment Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setAssigning(false);
    }
  };

  useEffect(() => {
    if (open && !hasPermission) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to assign students. This feature is only available for Institute Admins and Teachers.",
        variant: "destructive"
      });
      onOpenChange(false);
    }
  }, [open, hasPermission]);

  useEffect(() => {
    if (!open) {
      setUserIds([]);
      setCurrentUserId('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Assign Users to Class
          </DialogTitle>
          <DialogDescription>
            Enter user IDs to assign to <strong>{selectedClass?.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userId">Add User ID</Label>
            <div className="flex gap-2">
              <Input
                id="userId"
                placeholder="Enter user ID"
                value={currentUserId}
                onChange={(e) => setCurrentUserId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddUserId();
                  }
                }}
                className="flex-1"
              />
              <Button 
                type="button"
                onClick={handleAddUserId}
                disabled={!currentUserId.trim()}
                size="icon"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {userIds.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm">Added Users ({userIds.length})</Label>
              <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/50">
                {userIds.map((id) => (
                  <Badge key={id} variant="secondary" className="gap-1 text-xs">
                    {id}
                    <button
                      type="button"
                      onClick={() => handleRemoveUserId(id)}
                      className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssignStudents}
            disabled={userIds.length === 0 || assigning}
          >
            {assigning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign Users
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AssignStudentsDialog;