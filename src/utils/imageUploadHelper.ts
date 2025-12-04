import { getBaseUrl } from '@/contexts/utils/auth.api';

export interface SignedUrlResponse {
  success: boolean;
  message: string;
  uploadUrl: string;
  publicUrl: string;
  relativePath: string;
  fields: Record<string, string>;
  instructions?: {
    step1: string;
    step2: string;
    step3: string;
    step4: string;
  };
}

export const getSignedUrl = async (
  folder: string,
  fileName: string,
  contentType: string,
  fileSize: number
): Promise<SignedUrlResponse> => {
  const token = localStorage.getItem('access_token');
  const params = new URLSearchParams({
    folder,
    fileName,
    contentType,
    fileSize: fileSize.toString()
  });

  console.log('📤 Requesting signed URL:', {
    url: `${getBaseUrl()}/upload/get-signed-url?${params}`,
    folder,
    fileName,
    contentType,
    fileSize
  });

  const response = await fetch(`${getBaseUrl()}/upload/get-signed-url?${params}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Signed URL error:', {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    });
    throw new Error(`Failed to get signed URL: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  console.log('✅ Signed URL response:', result);
  return result;
};

export const uploadToSignedUrl = async (
  uploadUrl: string,
  file: Blob,
  fields?: Record<string, string>
): Promise<void> => {
  console.log('📤 Uploading to cloud storage:', { size: file.size, hasFields: !!fields });
  
  try {
    if (fields && Object.keys(fields).length > 0) {
      // AWS S3 POST with FormData
      console.log('📤 Using AWS S3 POST method with fields');
      const formData = new FormData();
      
      // IMPORTANT: Add all fields from backend BEFORE the file
      Object.keys(fields).forEach(key => {
        formData.append(key, fields[key]);
      });
      
      // Add file LAST
      formData.append('file', file);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
        // DO NOT set Content-Type header - browser sets it automatically
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('❌ S3 upload error:', {
          status: response.status,
          error: errorText
        });
        throw new Error(`S3 upload failed (${response.status}): ${errorText || response.statusText}`);
      }
      
      console.log('✅ File uploaded successfully to S3');
    } else {
      // GCS PUT with direct file upload (legacy - backend not migrated yet)
      console.log('📤 Using GCS PUT method (legacy)');
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'x-goog-content-length-range': `0,${100 * 1024 * 1024}` // 100MB max - MUST match backend signature
        },
        body: file
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('❌ GCS upload error:', {
          status: response.status,
          error: errorText
        });
        throw new Error(`GCS upload failed (${response.status}): ${errorText || response.statusText}`);
      }
      
      console.log('✅ File uploaded successfully to GCS');
    }
  } catch (error) {
    console.error('❌ Upload failed:', error);
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new Error('Network error: Unable to upload file. Check your internet connection.');
    }
    throw error;
  }
};

export const verifyAndPublish = async (relativePath: string): Promise<void> => {
  const token = localStorage.getItem('access_token');
  
  console.log('📤 Verifying and publishing:', { relativePath });
  
  const response = await fetch(`${getBaseUrl()}/upload/verify-and-publish`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ relativePath }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Verify/publish error:', {
      status: response.status,
      error: errorText
    });
    throw new Error(`Failed to verify and publish: ${response.status}`);
  }
  
  console.log('✅ File verified and published');
};

// Auto-detect folder based on file type and context
export const detectFolder = (file: File, context?: 'homework' | 'payment' | 'correction' | 'profile' | 'institute' | 'subject' | 'student' | 'id-document' | 'institute-user'): string => {
  const mimeType = file.type;
  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';
  
  if (context === 'homework') return 'homework-files';
  if (context === 'correction') return 'correction-files';
  if (context === 'payment') return 'institute-payment-receipts';
  if (context === 'id-document') return 'id-documents';
  if (context === 'profile') return 'profile-images';
  if (context === 'institute') return 'institute-images';
  if (context === 'subject') return 'subject-images';
  if (context === 'student') return 'student-images';
  if (context === 'institute-user') return 'institute-user-images';
  
  // Default fallback based on file type
  if (isImage) return 'profile-images';
  if (isPdf) return 'homework-files';
  return 'homework-files';
};

// Complete upload workflow: get signed URL → upload → verify → return relativePath
export const uploadFileSimple = async (
  file: File,
  folder: string,
  onProgress?: (message: string, progress: number) => void
): Promise<string> => {
  try {
    // Step 1: Get signed URL
    onProgress?.('Getting upload URL...', 10);
    const contentType = file.type || 'application/octet-stream';
    const signedUrlData = await getSignedUrl(folder, file.name, contentType, file.size);
    
    // Step 2: Upload to S3 with FormData
    onProgress?.('Uploading file...', 50);
    await uploadToSignedUrl(signedUrlData.uploadUrl, file, signedUrlData.fields);
    
    // Step 3: Verify and publish
    onProgress?.('Verifying upload...', 80);
    await verifyAndPublish(signedUrlData.relativePath);
    
    // Step 4: Return relativePath
    onProgress?.('Upload complete!', 100);
    return signedUrlData.relativePath;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};
