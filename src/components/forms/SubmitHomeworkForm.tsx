import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { homeworkSubmissionsApi, type GoogleDriveSubmissionData } from '@/api/homeworkSubmissions.api';
import { 
  Upload, 
  FileText, 
  File, 
  X, 
  Cloud, 
  HardDrive,
  CheckCircle2,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { uploadWithSignedUrl } from '@/utils/signedUploadHelper';
import GoogleDriveUploader from './GoogleDriveUploader';
import { cn } from '@/lib/utils';

const submissionSchema = z.object({
  submissionDate: z.string().min(1, 'Submission date is required'),
  remarks: z.string().optional()
});

type SubmissionFormData = z.infer<typeof submissionSchema>;

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
}

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
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<'upload' | 'google-drive'>('upload');
  
  // Traditional upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Google Drive state
  const [googleDriveFile, setGoogleDriveFile] = useState<GoogleDriveFile | null>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SubmissionFormData>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      submissionDate: new Date().toISOString().split('T')[0],
      remarks: ''
    }
  });

  // Early return if homework is not provided
  if (!homework) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No homework selected</p>
      </div>
    );
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
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

  const handleGoogleDriveFileSelected = (file: GoogleDriveFile, accessToken: string) => {
    setGoogleDriveFile(file);
    setGoogleAccessToken(accessToken);
  };

  const clearGoogleDriveFile = () => {
    setGoogleDriveFile(null);
    setGoogleAccessToken(null);
  };

  const hasFileSelected = uploadMethod === 'upload' ? !!selectedFile : !!googleDriveFile;

  const onSubmit = async (data: SubmissionFormData) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive"
      });
      return;
    }

    if (!hasFileSelected) {
      toast({
        title: "Error",
        description: "Please select a file to submit",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (uploadMethod === 'google-drive' && googleDriveFile && googleAccessToken) {
        // Submit via Google Drive
        console.log('Submitting homework via Google Drive:', {
          homeworkId: homework.id,
          fileId: googleDriveFile.id,
          fileName: googleDriveFile.name
        });

        const result = await homeworkSubmissionsApi.submitViaGoogleDrive({
          homeworkId: homework.id,
          fileId: googleDriveFile.id,
          accessToken: googleAccessToken,
          fileName: googleDriveFile.name,
          mimeType: googleDriveFile.mimeType
        });

        toast({
          title: "Success",
          description: result.message || "Homework submitted successfully via Google Drive!"
        });
        onSuccess();
      } else if (uploadMethod === 'upload' && selectedFile) {
        // Traditional upload
        setIsUploading(true);
        
        const relativePath = await uploadWithSignedUrl(
          selectedFile,
          'homework-files',
          (message, progress) => {
            setUploadMessage(message);
            setUploadProgress(progress);
          }
        );

        const result = await homeworkSubmissionsApi.submitHomework(
          homework.id,
          relativePath,
          {
            submissionDate: data.submissionDate,
            remarks: data.remarks
          }
        );

        toast({
          title: "Success",
          description: result.message || "Homework submitted successfully!"
        });
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error submitting homework:', error);
      let errorMessage = "Failed to submit homework. Please try again.";
      
      if (error.message?.includes("not found")) {
        errorMessage = "This homework assignment is not available for submission.";
      } else if (error.message?.includes("period")) {
        errorMessage = "The submission period has ended.";
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

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-3 w-full">
      {/* Compact Homework Info */}
      <div className="flex items-start gap-2 p-2 sm:p-3 rounded-lg bg-muted/50 border">
        <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="font-medium text-xs sm:text-sm truncate">{homework.title}</h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1 mt-0.5">{homework.description}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {homework.endDate && (
              <Badge variant="secondary" className="text-[10px] h-4 px-1">
                Due: {new Date(homework.endDate).toLocaleDateString()}
              </Badge>
            )}
            {homework.referenceLink && (
              <Button 
                type="button"
                size="sm" 
                variant="ghost" 
                onClick={() => window.open(homework.referenceLink, '_blank')}
                className="h-4 px-1 text-[10px] text-primary hover:text-primary"
              >
                <ExternalLink className="h-2.5 w-2.5 mr-0.5" />
                Ref
              </Button>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        {/* Upload Method - Compact Tabs */}
        <Tabs 
          value={uploadMethod} 
          onValueChange={(v) => setUploadMethod(v as 'upload' | 'google-drive')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger 
              value="upload" 
              className="flex items-center gap-1 text-[10px] sm:text-xs h-6"
            >
              <HardDrive className="h-3 w-3" />
              <span>Upload</span>
            </TabsTrigger>
            <TabsTrigger 
              value="google-drive"
              className="flex items-center gap-1 text-[10px] sm:text-xs h-6"
            >
              <Cloud className="h-3 w-3" />
              <span>Drive</span>
            </TabsTrigger>
          </TabsList>

          {/* Traditional Upload - Compact */}
          <TabsContent value="upload" className="mt-2">
            {!selectedFile ? (
              <div>
                <input
                  type="file"
                  id="file-upload"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.zip"
                  className="hidden"
                  disabled={isUploading || isSubmitting}
                />
                <label
                  htmlFor="file-upload"
                  className={cn(
                    "flex flex-col items-center justify-center w-full py-4 sm:py-5 border-2 border-dashed rounded-lg transition-all cursor-pointer",
                    isUploading || isSubmitting
                      ? "border-muted bg-muted/50 cursor-not-allowed"
                      : "border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5 active:scale-[0.99]"
                  )}
                >
                  <Upload className={cn(
                    "h-5 w-5 mb-1",
                    isUploading ? "animate-spin text-primary" : "text-muted-foreground"
                  )} />
                  <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">
                    {isUploading ? 'Uploading...' : 'Tap to select file'}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground/70 mt-0.5">
                    PDF, DOC, JPG, PNG (max 10MB)
                  </p>
                </label>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/50 border border-primary/20">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-[10px] sm:text-xs truncate">{selectedFile.name}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  disabled={isSubmitting}
                  className="h-6 w-6 p-0 hover:text-destructive shrink-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Google Drive Upload */}
          <TabsContent value="google-drive" className="mt-2">
            <GoogleDriveUploader
              onFileSelected={handleGoogleDriveFileSelected}
              onClear={clearGoogleDriveFile}
              selectedFile={googleDriveFile}
              disabled={isSubmitting}
            />
          </TabsContent>
        </Tabs>

        {/* Remarks - Compact */}
        <div className="space-y-1">
          <Label htmlFor="remarks" className="text-[10px] sm:text-xs">Notes (Optional)</Label>
          <Textarea
            id="remarks"
            placeholder="Any comments..."
            {...register('remarks')}
            rows={2}
            className="text-xs sm:text-sm resize-none min-h-[50px]"
          />
        </div>

        {/* Hidden submission date - auto-filled */}
        <input type="hidden" {...register('submissionDate')} />

        {/* Submit Buttons - Compact */}
        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 h-8 text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting || !hasFileSelected}
            className="flex-1 h-8 text-xs"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                <span>{uploadMessage || 'Submitting...'}</span>
              </>
            ) : (
              <>
                <Upload className="h-3 w-3 mr-1" />
                <span>Submit</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SubmitHomeworkForm;
