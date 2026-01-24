import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Link as LinkIcon, 
  HardDrive,
  Video,
  Image,
  FileText,
  File,
  Music,
  Loader2,
  X,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { 
  homeworkReferencesApi, 
  ReferenceType, 
  HomeworkReference,
  formatFileSize,
  getAcceptedFileTypes,
  getMaxFileSize,
  detectReferenceType
} from '@/api/homeworkReferences.api';

interface AddReferenceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  homeworkId: string;
  onSuccess: (reference: HomeworkReference) => void;
}

const REFERENCE_TYPES: { value: ReferenceType; label: string; icon: React.ElementType }[] = [
  { value: 'VIDEO', label: 'Video', icon: Video },
  { value: 'IMAGE', label: 'Image', icon: Image },
  { value: 'PDF', label: 'PDF', icon: FileText },
  { value: 'DOCUMENT', label: 'Document', icon: File },
  { value: 'AUDIO', label: 'Audio', icon: Music },
  { value: 'LINK', label: 'Link', icon: LinkIcon },
  { value: 'OTHER', label: 'Other', icon: File },
];

const AddReferenceDialog: React.FC<AddReferenceDialogProps> = ({
  isOpen,
  onClose,
  homeworkId,
  onSuccess,
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<'upload' | 'link' | 'drive'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Common fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [referenceType, setReferenceType] = useState<ReferenceType>('OTHER');
  
  // File upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Link
  const [externalUrl, setExternalUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  
  // Google Drive
  const [driveFileId, setDriveFileId] = useState('');
  const [driveAccessToken, setDriveAccessToken] = useState('');

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setReferenceType('OTHER');
    setSelectedFile(null);
    setExternalUrl('');
    setLinkTitle('');
    setDriveFileId('');
    setDriveAccessToken('');
    setUploadProgress(0);
    setActiveTab('upload');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const detectedType = detectReferenceType(file);
    const maxSize = getMaxFileSize(detectedType);

    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: `Maximum size for ${detectedType} is ${formatFileSize(maxSize)}`,
        variant: 'destructive',
      });
      return;
    }

    setSelectedFile(file);
    setReferenceType(detectedType);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, '')); // Remove extension for title
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile || !title) {
      toast({
        title: 'Missing information',
        description: 'Please select a file and enter a title',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const reference = await homeworkReferencesApi.uploadFileToS3(
        homeworkId,
        selectedFile,
        title,
        referenceType,
        description,
        setUploadProgress
      );

      toast({
        title: 'Reference added',
        description: `"${title}" has been uploaded successfully`,
      });

      onSuccess(reference);
      handleClose();
    } catch (error: any) {
      console.error('Upload failed:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload file',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  const handleLinkSubmit = async () => {
    if (!externalUrl || !title) {
      toast({
        title: 'Missing information',
        description: 'Please enter a URL and title',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const reference = await homeworkReferencesApi.createFromLink({
        homeworkId,
        title,
        description,
        referenceType,
        externalUrl,
        linkTitle,
      });

      toast({
        title: 'Reference added',
        description: `"${title}" has been added successfully`,
      });

      onSuccess(reference);
      handleClose();
    } catch (error: any) {
      console.error('Link creation failed:', error);
      toast({
        title: 'Failed to add link',
        description: error.message || 'Failed to add link reference',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleDriveAuth = async () => {
    try {
      const popup = window.open(
        'https://lmsapi.suraksha.lk/auth/google',
        'Google OAuth',
        'width=600,height=700,left=200,top=100'
      );

      if (!popup) {
        toast({
          title: 'Popup blocked',
          description: 'Please allow popups for Google Drive authentication',
          variant: 'destructive',
        });
        return;
      }

      const checkInterval = setInterval(() => {
        try {
          if (popup.location.href.includes('#access_token=')) {
            const params = new URLSearchParams(popup.location.hash.substring(1));
            const token = params.get('access_token');
            
            clearInterval(checkInterval);
            popup.close();
            
            if (token) {
              setDriveAccessToken(token);
              toast({
                title: 'Connected to Google Drive',
                description: 'You can now add files from your Drive',
              });
            }
          }
        } catch (e) {
          // Cross-origin - still authenticating
        }

        if (popup.closed) {
          clearInterval(checkInterval);
        }
      }, 500);
    } catch (error) {
      toast({
        title: 'Authentication failed',
        description: 'Failed to connect to Google Drive',
        variant: 'destructive',
      });
    }
  };

  const handleDriveSubmit = async () => {
    if (!driveFileId || !title || !driveAccessToken) {
      toast({
        title: 'Missing information',
        description: 'Please authenticate with Google Drive and enter the file ID',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const reference = await homeworkReferencesApi.createFromGoogleDrive({
        homeworkId,
        title,
        description,
        referenceType,
        driveFileId,
        accessToken: driveAccessToken,
      });

      toast({
        title: 'Reference added',
        description: `"${title}" has been added from Google Drive`,
      });

      onSuccess(reference);
      handleClose();
    } catch (error: any) {
      console.error('Drive reference creation failed:', error);
      toast({
        title: 'Failed to add Drive file',
        description: error.message || 'Failed to add Google Drive reference',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    switch (activeTab) {
      case 'upload':
        handleUploadSubmit();
        break;
      case 'link':
        handleLinkSubmit();
        break;
      case 'drive':
        handleDriveSubmit();
        break;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Reference Material</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="link" className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Link
            </TabsTrigger>
            <TabsTrigger value="drive" className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" />
              Drive
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 space-y-4">
            {/* Common Fields */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter reference title"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description (optional)"
                  rows={2}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Type</Label>
                <Select value={referenceType} onValueChange={(v) => setReferenceType(v as ReferenceType)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REFERENCE_TYPES.map(({ value, label, icon: Icon }) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tab-specific content */}
            <TabsContent value="upload" className="mt-0 space-y-3">
              <div>
                <Label>File</Label>
                <div 
                  className="mt-1 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {selectedFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="font-medium">{selectedFile.name}</span>
                      <span className="text-muted-foreground">({formatFileSize(selectedFile.size)})</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Click to select a file or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Max: {formatFileSize(getMaxFileSize(referenceType))}
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept={getAcceptedFileTypes(referenceType)}
                  onChange={handleFileSelect}
                />
              </div>

              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="link" className="mt-0 space-y-3">
              <div>
                <Label htmlFor="externalUrl">URL *</Label>
                <Input
                  id="externalUrl"
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder="https://example.com/resource"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="linkTitle">Link Button Text</Label>
                <Input
                  id="linkTitle"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  placeholder="e.g., Watch on YouTube"
                  className="mt-1"
                />
              </div>
            </TabsContent>

            <TabsContent value="drive" className="mt-0 space-y-3">
              {!driveAccessToken ? (
                <div className="text-center py-4">
                  <HardDrive className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect your Google Drive to add files
                  </p>
                  <Button onClick={handleGoogleDriveAuth}>
                    <HardDrive className="h-4 w-4 mr-2" />
                    Connect Google Drive
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="text-sm text-green-700 dark:text-green-400">
                      Connected to Google Drive
                    </span>
                  </div>
                  <div>
                    <Label htmlFor="driveFileId">File ID *</Label>
                    <Input
                      id="driveFileId"
                      value={driveFileId}
                      onChange={(e) => setDriveFileId(e.target.value)}
                      placeholder="Enter Google Drive file ID"
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      You can find this in the file's sharing URL
                    </p>
                  </div>
                </>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || (activeTab === 'drive' && !driveAccessToken)}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {activeTab === 'upload' ? 'Uploading...' : 'Adding...'}
              </>
            ) : (
              'Add Reference'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddReferenceDialog;
