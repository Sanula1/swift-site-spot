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
    <div className="space-y-6">
      {/* Homework Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{homework.title}</h3>
              <p className="text-muted-foreground text-sm mt-1">{homework.description}</p>
              {homework.endDate && (
                <Badge variant="outline" className="mt-2">
                  Due: {new Date(homework.endDate).toLocaleDateString()}
                </Badge>
              )}
            </div>
          </div>
          {homework.referenceLink && (
            <Button 
              type="button"
              size="sm" 
              variant="outline" 
              onClick={() => window.open(homework.referenceLink, '_blank')}
              className="mt-3"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              View Reference Material
            </Button>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Submission Date */}
        <div className="space-y-2">
          <Label htmlFor="submissionDate">Submission Date *</Label>
          <Input 
            id="submissionDate" 
            type="date" 
            {...register('submissionDate')} 
            className="w-full" 
          />
          {errors.submissionDate && (
            <p className="text-sm text-destructive">{errors.submissionDate.message}</p>
          )}
        </div>

        {/* Upload Method Tabs */}
        <div className="space-y-4">
          <Label>Upload Method</Label>
          <Tabs 
            value={uploadMethod} 
            onValueChange={(v) => setUploadMethod(v as 'upload' | 'google-drive')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 h-auto p-1">
              <TabsTrigger 
                value="upload" 
                className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <HardDrive className="h-4 w-4" />
                <span className="hidden sm:inline">Traditional</span> Upload
              </TabsTrigger>
              <TabsTrigger 
                value="google-drive"
                className="flex items-center gap-2 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Cloud className="h-4 w-4" />
                Google Drive
              </TabsTrigger>
            </TabsList>

            {/* Traditional Upload */}
            <TabsContent value="upload" className="mt-4">
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
                      "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg transition-all cursor-pointer",
                      isUploading || isSubmitting
                        ? "border-muted bg-muted/50 cursor-not-allowed"
                        : "border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5"
                    )}
                  >
                    <Upload className={cn(
                      "h-8 w-8 mb-2",
                      isUploading ? "animate-spin text-primary" : "text-muted-foreground"
                    )} />
                    <p className="text-sm text-muted-foreground">
                      {isUploading ? 'Uploading file...' : 'Click to upload your homework file'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOC, DOCX, TXT, JPG, PNG, ZIP (max 10MB)
                    </p>
                  </label>
                </div>
              ) : (
                <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(selectedFile.size)} • Ready to submit
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeFile}
                        disabled={isSubmitting}
                        className="h-8 w-8 p-0 hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Google Drive Upload */}
            <TabsContent value="google-drive" className="mt-4">
              <GoogleDriveUploader
                onFileSelected={handleGoogleDriveFileSelected}
                onClear={clearGoogleDriveFile}
                selectedFile={googleDriveFile}
                disabled={isSubmitting}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Remarks */}
        <div className="space-y-2">
          <Label htmlFor="remarks">Additional Notes (Optional)</Label>
          <Textarea
            id="remarks"
            placeholder="Any additional notes or comments about your submission..."
            {...register('remarks')}
            rows={3}
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !hasFileSelected}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {uploadMessage || 'Submitting...'}
              </>
            ) : (
              <>
                {uploadMethod === 'google-drive' ? (
                  <Cloud className="h-4 w-4 mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Submit Homework
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SubmitHomeworkForm;
