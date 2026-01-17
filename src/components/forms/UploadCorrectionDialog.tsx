import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/api/client';
import { Upload, X } from 'lucide-react';
import { uploadWithSignedUrl } from '@/utils/signedUploadHelper';

export interface HomeworkSubmission {
  id: string;
  homeworkId: string;
  studentId: string;
  submissionDate: string;
  fileUrl?: string;
  teacherCorrectionFileUrl?: string;
  remarks?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  student?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface UploadCorrectionDialogProps {
  submissionId: string;
  studentName: string;
  submission?: HomeworkSubmission;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const UploadCorrectionDialog = ({ 
  submissionId, 
  studentName,
  submission,
  isOpen, 
  onClose, 
  onSuccess 
}: UploadCorrectionDialogProps) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    homeworkId: '',
    studentId: '',
    submissionDate: '',
    remarks: '',
    isActive: true
  });

  useEffect(() => {
    if (submission && isOpen) {
      setFormData({
        homeworkId: submission.homeworkId,
        studentId: submission.studentId,
        submissionDate: submission.submissionDate.split('T')[0],
        remarks: '',
        isActive: submission.isActive
      });
    }
  }, [submission, isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('UploadCorrectionDialog - submissionId:', submissionId, 'submission:', submission);
    
    if (!file) {
      toast({
        title: "Error",
        description: "Please select a correction file to upload",
        variant: "destructive"
      });
      return;
    }
    
    // Use submission.id as fallback if submissionId prop is undefined
    const effectiveId = submissionId || submission?.id;
    if (!effectiveId) {
      toast({
        title: "Error",
        description: "Submission ID is missing",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      // Step 1: Upload correction file using signed URL
      setUploadMessage('Uploading correction file...');
      const relativePath = await uploadWithSignedUrl(
        file,
        'correction-files',
        (message, progress) => {
          setUploadMessage(message);
          setUploadProgress(progress);
        }
      );

      // Step 2: Update submission with relativePath
      const updateData = {
        homeworkId: formData.homeworkId,
        studentId: formData.studentId,
        submissionDate: formData.submissionDate,
        remarks: formData.remarks,
        isActive: formData.isActive,
        teacherCorrectionFileUrl: relativePath
      };

      const effectiveId = submissionId || submission?.id;
      const response = await apiClient.patch(
        `/institute-class-subject-homeworks-submissions/${effectiveId}`,
        updateData
      );

      toast({
        title: "Success",
        description: "Submission updated successfully",
      });

      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error updating submission:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update submission",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setFormData({
      homeworkId: '',
      studentId: '',
      submissionDate: '',
      remarks: '',
      isActive: true
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Update Submission & Upload Correction
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-4">
              Update submission details for <strong>{studentName}</strong>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="homeworkId">Homework ID</Label>
            <Input
              id="homeworkId"
              value={formData.homeworkId}
              disabled
              readOnly
              required
              className="bg-muted/50 cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="studentId">Student ID</Label>
            <Input
              id="studentId"
              value={formData.studentId}
              disabled
              readOnly
              required
              className="bg-muted/50 cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="submissionDate">Submission Date</Label>
            <Input
              id="submissionDate"
              type="date"
              value={formData.submissionDate}
              onChange={(e) => setFormData({ ...formData, submissionDate: e.target.value })}
              disabled={isUploading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              disabled={isUploading}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isActive"
              checked={formData.isActive}
              onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              disabled={isUploading}
            />
            <Label htmlFor="isActive">Active Status</Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="correction-file">Teacher Correction File *</Label>
            <Input
              id="correction-file"
              type="file"
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              disabled={isUploading}
              required
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Selected: {file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                  disabled={isUploading}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!file || isUploading}
            >
              {isUploading ? (uploadMessage || 'Updating...') : 'Update Submission'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UploadCorrectionDialog;
