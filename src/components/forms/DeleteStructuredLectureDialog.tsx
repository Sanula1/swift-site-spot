import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { structuredLecturesApi, StructuredLecture } from '@/api/structuredLectures.api';
import { Loader2 } from 'lucide-react';

interface DeleteStructuredLectureDialogProps {
  lecture: StructuredLecture;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const DeleteStructuredLectureDialog = ({ 
  lecture, 
  open, 
  onOpenChange, 
  onSuccess 
}: DeleteStructuredLectureDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await structuredLecturesApi.delete(lecture.id);
      
      toast({
        title: "Success",
        description: "Lecture deleted successfully"
      });
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting lecture:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete lecture",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Lecture</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{lecture.title}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete} 
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteStructuredLectureDialog;
