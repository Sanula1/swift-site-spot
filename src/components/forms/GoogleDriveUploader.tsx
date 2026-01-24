import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Cloud, 
  CloudUpload, 
  File, 
  X, 
  CheckCircle2, 
  Loader2,
  ExternalLink,
  Link2
} from 'lucide-react';
import { cn } from '@/lib/utils';
const GOOGLE_CLIENT_ID = '696735498700-vifcskk15iiq8731ic53fm2ukfo7g3av.apps.googleusercontent.com';
const BACKEND_URL = 'https://lmsapi.suraksha.lk';

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
}

interface GoogleDriveUploaderProps {
  onFileSelected: (file: GoogleDriveFile, accessToken: string) => void;
  onClear: () => void;
  selectedFile: GoogleDriveFile | null;
  disabled?: boolean;
  acceptedTypes?: string;
}

const GoogleDriveUploader: React.FC<GoogleDriveUploaderProps> = ({
  onFileSelected,
  onClear,
  selectedFile,
  disabled = false,
  acceptedTypes = '.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.zip'
}) => {
  const { toast } = useToast();
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [localFile, setLocalFile] = useState<File | null>(null);

  // Check for stored token on mount
  useEffect(() => {
    const storedToken = sessionStorage.getItem('google_drive_token');
    if (storedToken && !googleAccessToken) {
      setGoogleAccessToken(storedToken);
      toast({
        title: "Connected to Google Drive",
        description: "You can now upload files to your Google Drive",
      });
    }
  }, [toast, googleAccessToken]);

  // Connect to Google Drive
  const connectGoogleDrive = useCallback(() => {
    setIsConnecting(true);
    
    // Save current URL to return after OAuth
    sessionStorage.setItem('google_oauth_return_url', window.location.pathname + window.location.search);
    
    // Build OAuth URL for implicit grant flow
    const redirectUri = `${window.location.origin}/auth/google/callback`;
    const scope = 'https://www.googleapis.com/auth/drive.file';
    
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'token');
    authUrl.searchParams.set('scope', scope);
    authUrl.searchParams.set('include_granted_scopes', 'true');
    authUrl.searchParams.set('prompt', 'consent');
    
    window.location.href = authUrl.toString();
  }, []);

  // Disconnect from Google Drive
  const disconnectGoogleDrive = useCallback(() => {
    setGoogleAccessToken(null);
    sessionStorage.removeItem('google_drive_token');
    setLocalFile(null);
    onClear();
    toast({
      title: "Disconnected",
      description: "Google Drive has been disconnected",
    });
  }, [onClear, toast]);

  // Handle file selection for upload to Drive
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
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
      setLocalFile(file);
    }
  }, [toast]);

  // Upload file to Google Drive
  const uploadToGoogleDrive = useCallback(async () => {
    if (!localFile || !googleAccessToken) return;

    setIsUploading(true);
    try {
      const metadata = {
        name: localFile.name,
        mimeType: localFile.type || 'application/octet-stream',
      };

      const formData = new FormData();
      formData.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json' })
      );
      formData.append('file', localFile);

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size',
        {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${googleAccessToken}` 
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          // Token expired
          setGoogleAccessToken(null);
          sessionStorage.removeItem('google_drive_token');
          throw new Error('Google Drive session expired. Please reconnect.');
        }
        throw new Error(errorData.error?.message || 'Upload failed');
      }

      const data = await response.json();
      
      const driveFile: GoogleDriveFile = {
        id: data.id,
        name: data.name,
        mimeType: data.mimeType,
        size: parseInt(data.size) || localFile.size
      };

      onFileSelected(driveFile, googleAccessToken);
      setLocalFile(null);
      
      toast({
        title: "Uploaded to Google Drive",
        description: `${driveFile.name} has been uploaded successfully`,
      });
    } catch (error: any) {
      console.error('Google Drive upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file to Google Drive",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  }, [localFile, googleAccessToken, onFileSelected, toast]);

  // Clear local file
  const clearLocalFile = useCallback(() => {
    setLocalFile(null);
  }, []);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cloud className={cn(
            "h-5 w-5",
            googleAccessToken ? "text-green-600" : "text-muted-foreground"
          )} />
          <span className="text-sm font-medium">Google Drive</span>
          {googleAccessToken && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
        </div>
        {googleAccessToken ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={disconnectGoogleDrive}
            disabled={disabled}
            className="text-muted-foreground hover:text-destructive"
          >
            Disconnect
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={connectGoogleDrive}
            disabled={disabled || isConnecting}
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 mr-2" />
                Connect
              </>
            )}
          </Button>
        )}
      </div>

      {/* Not Connected State */}
      {!googleAccessToken && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Cloud className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="font-medium mb-2">Connect Google Drive</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Upload your homework directly to your Google Drive and submit the link.
              Files stay in your account.
            </p>
            <Button
              type="button"
              onClick={connectGoogleDrive}
              disabled={disabled}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Cloud className="h-4 w-4 mr-2" />
              Connect Google Drive
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Connected State - File Selection */}
      {googleAccessToken && !selectedFile && (
        <div className="space-y-4">
          {/* Local file selected, ready to upload */}
          {localFile ? (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <File className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{localFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(localFile.size)} • Ready to upload
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearLocalFile}
                      disabled={isUploading}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button
                  type="button"
                  onClick={uploadToGoogleDrive}
                  disabled={isUploading}
                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading to Drive...
                    </>
                  ) : (
                    <>
                      <CloudUpload className="h-4 w-4 mr-2" />
                      Upload to Google Drive
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* File picker */
            <div>
              <input
                type="file"
                id="google-drive-file-upload"
                onChange={handleFileSelect}
                accept={acceptedTypes}
                className="hidden"
                disabled={disabled || isUploading}
              />
              <label
                htmlFor="google-drive-file-upload"
                className={cn(
                  "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg transition-all cursor-pointer",
                  disabled || isUploading
                    ? "border-muted bg-muted/50 cursor-not-allowed"
                    : "border-blue-300 hover:border-blue-500 hover:bg-blue-50/50"
                )}
              >
                <CloudUpload className="h-8 w-8 mb-2 text-blue-500" />
                <p className="text-sm font-medium text-blue-600">
                  Select file to upload to Google Drive
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOC, DOCX, TXT, JPG, PNG, ZIP (max 10MB)
                </p>
              </label>
            </div>
          )}
        </div>
      )}

      {/* File Selected and Uploaded to Drive */}
      {googleAccessToken && selectedFile && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.size)} • Uploaded to Google Drive
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`https://drive.google.com/file/d/${selectedFile.id}/view`, '_blank')}
                  className="h-8 w-8 p-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClear}
                  disabled={disabled}
                  className="h-8 w-8 p-0 hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GoogleDriveUploader;
