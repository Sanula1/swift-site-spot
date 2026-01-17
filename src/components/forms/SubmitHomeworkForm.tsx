import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { homeworkSubmissionsApi, type HomeworkSubmissionCreateData } from '@/api/homeworkSubmissions.api';
import { Upload, FileText, File, X, CalendarIcon } from 'lucide-react';
import { uploadWithSignedUrl } from '@/utils/signedUploadHelper';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
const submissionSchema = z.object({
  submissionDate: z.string().min(1, 'Submission date is required'),
  remarks: z.string().optional()
});
type SubmissionFormData = z.infer<typeof submissionSchema>;
interface SubmitHomeworkFormProps {
  homework: any;
  onClose: () => void;
  onSuccess: () => void;
}
const SubmitHomeworkForm = ({
  homework,
  onClose,
  onSuccess
}: SubmitHomeworkFormProps) => {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Early return if homework is not provided
  if (!homework) {
    return <div className="text-center py-8">
        <p className="text-muted-foreground">No homework selected</p>
      </div>;
  }
  const {
    register,
    handleSubmit,
    formState: {
      errors
    },
    watch,
    setValue
  } = useForm<SubmissionFormData>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      submissionDate: new Date().toISOString().split('T')[0],
      remarks: ''
    }
  });
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (limit to 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
      toast({
        title: "File selected",
        description: "File ready for submission"
      });
    }
  };
  const removeFile = () => {
    setSelectedFile(null);
  };
  const onSubmit = async (data: SubmissionFormData) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive"
      });
      return;
    }
    if (!selectedFile) {
      toast({
        title: "Error",
        description: "Please select a file to submit",
        variant: "destructive"
      });
      return;
    }
    console.log('Starting homework submission:', {
      homeworkId: homework.id,
      homeworkTitle: homework.title,
      userId: user.id,
      fileName: selectedFile.name,
      submissionDate: data.submissionDate
    });
    setIsSubmitting(true);
    setIsUploading(true);
    try {
      // Step 1: Upload file and get relativePath using signed URL
      const relativePath = await uploadWithSignedUrl(
        selectedFile,
        'homework-files',
        (message, progress) => {
          setUploadMessage(message);
          setUploadProgress(progress);
        }
      );

      // Step 2: Submit homework with relativePath as fileUrl
      const result = await homeworkSubmissionsApi.submitHomework(
        homework.id,
        relativePath,
        {
          submissionDate: data.submissionDate,
          remarks: data.remarks
        }
      );
      console.log('Homework submission result:', result);
      toast({
        title: "Success",
        description: result.message || "Homework submitted successfully!"
      });
      onSuccess();
    } catch (error: any) {
      console.error('Error submitting homework:', {
        homeworkId: homework.id,
        error: error.message,
        errorDetails: error
      });
      let errorMessage = "Failed to submit homework. Please try again.";
      if (error.message?.includes("not found")) {
        errorMessage = "This homework assignment is not available for submission. Please contact your teacher.";
      } else if (error.message?.includes("period")) {
        errorMessage = "The submission period for this homework has not started yet or has ended.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast({
        title: "Submission Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };
  return <div className="space-y-6">
      <div className="bg-muted/50 p-4 rounded-lg border">
        <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {homework.title}
        </h3>
        <p className="text-muted-foreground mb-2">{homework.description}</p>
        {homework.endDate}
        {homework.referenceLink && <div className="mt-2">
            <Button size="sm" variant="outline" onClick={() => window.open(homework.referenceLink, '_blank')}>
              <FileText className="h-3 w-3 mr-1" />
              View Reference Material
            </Button>
          </div>}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="submissionDate">Submission Date *</Label>
          <Input id="submissionDate" type="date" {...register('submissionDate')} className="w-full" />
          {errors.submissionDate && <p className="text-sm text-destructive">{errors.submissionDate.message}</p>}
        </div>

        {/* File Upload Section */}
        <div className="space-y-2">
          <Label>Upload File</Label>
          
          {!selectedFile ? <div>
              <input type="file" id="file-upload" onChange={handleFileSelect} accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.zip" className="hidden" disabled={isUploading} />
              <Label htmlFor="file-upload" className={`flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg transition-colors ${isUploading ? 'border-blue-300 bg-blue-50 cursor-not-allowed' : 'border-muted-foreground/25 cursor-pointer hover:border-muted-foreground/50'}`}>
                <div className="text-center">
                  <Upload className={`h-8 w-8 mx-auto mb-2 ${isUploading ? 'animate-spin text-blue-600' : 'text-muted-foreground'}`} />
                  <p className="text-sm text-muted-foreground">
                    {isUploading ? 'Uploading file...' : 'Click to upload your homework file'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, DOC, DOCX, TXT, JPG, PNG, ZIP (max 10MB)
                  </p>
                </div>
              </Label>
            </div> : <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <File className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Uploaded successfully
                    </p>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={removeFile} className="h-8 w-8 p-0">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>}
        </div>


        <div className="space-y-2">
          <Label htmlFor="remarks">Additional Notes (Optional)</Label>
          <Textarea id="remarks" placeholder="Any additional notes or comments about your submission..." {...register('remarks')} rows={3} />
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !selectedFile} className="flex-1">
            {isSubmitting ? <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                {uploadMessage || 'Submitting...'}
              </> : <>
                <Upload className="h-4 w-4 mr-2" />
                Submit Homework
              </>}
          </Button>
        </div>
      </form>
    </div>;
};
export default SubmitHomeworkForm;