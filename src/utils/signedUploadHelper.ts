import { getBaseUrl } from '@/contexts/utils/auth.api';

export type UploadFolder = 
  | 'profile-images'
  | 'student-images'
  | 'institute-images'
  | 'institute-user-images'
  | 'subject-images'
  | 'homework-files'
  | 'correction-files'
  | 'institute-payment-receipts'
  | 'subject-payment-receipts'
  | 'id-documents'
  | 'bookhire-vehicle-images'
  | 'bookhire-owner-images';

const UPLOAD_MAX_FILE_SIZES: Record<UploadFolder, number> = {
  'profile-images': 5 * 1024 * 1024,        // 5MB
  'student-images': 5 * 1024 * 1024,        // 5MB
  'institute-images': 10 * 1024 * 1024,     // 10MB
  'institute-user-images': 5 * 1024 * 1024, // 5MB
  'subject-images': 5 * 1024 * 1024,        // 5MB
  'homework-files': 20 * 1024 * 1024,       // 20MB
  'correction-files': 20 * 1024 * 1024,     // 20MB
  'institute-payment-receipts': 10 * 1024 * 1024,     // 10MB
  'subject-payment-receipts': 10 * 1024 * 1024,       // 10MB
  'id-documents': 10 * 1024 * 1024,          // 10MB
  'bookhire-vehicle-images': 10 * 1024 * 1024,        // 10MB
  'bookhire-owner-images': 10 * 1024 * 1024           // 10MB
};

interface SignedUrlResponse {
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

/**
 * Auto-detect folder based on file type
 */
export function detectFolder(file: File): UploadFolder {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();
  
  // Images
  if (type.startsWith('image/')) {
    if (name.includes('profile')) return 'profile-images';
    if (name.includes('student')) return 'student-images';
    if (name.includes('institute')) return 'institute-images';
    if (name.includes('subject')) return 'subject-images';
    return 'profile-images'; // default for images
  }
  
  // Documents and PDFs
  if (type === 'application/pdf' || type.includes('document')) {
    if (name.includes('homework') || name.includes('assignment')) return 'homework-files';
    if (name.includes('correction') || name.includes('corrected')) return 'correction-files';
    if (name.includes('payment') || name.includes('receipt') || name.includes('slip')) return 'institute-payment-receipts';
    if (name.includes('id') || name.includes('identity') || name.includes('card')) return 'id-documents';
    return 'homework-files'; // default for documents
  }
  
  return 'homework-files'; // fallback
}

/**
 * Validate file before upload
 */
function validateFile(file: File, folder: UploadFolder): void {
  // Check file size
  const maxSize = UPLOAD_MAX_FILE_SIZES[folder];
  if (file.size > maxSize) {
    throw new Error(`File too large. Maximum size: ${maxSize / 1024 / 1024}MB`);
  }

  // Check for suspicious extensions
  const suspiciousExtensions = ['.exe', '.php', '.sh', '.bat', '.cmd', '.scr', '.vbs'];
  const fileName = file.name.toLowerCase();
  if (suspiciousExtensions.some(ext => fileName.endsWith(ext))) {
    throw new Error('File type not allowed for security reasons');
  }

  // Validate content type based on folder
  const allowedTypes: Record<UploadFolder, string[]> = {
    'profile-images': ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    'student-images': ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    'institute-images': ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp'],
    'institute-user-images': ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    'subject-images': ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp'],
    'homework-files': ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
    'correction-files': ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
    'institute-payment-receipts': ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
    'subject-payment-receipts': ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
    'id-documents': ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
    'bookhire-vehicle-images': ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    'bookhire-owner-images': ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  };

  const allowed = allowedTypes[folder];
  if (allowed && !allowed.includes(file.type)) {
    throw new Error(`Invalid file type for ${folder}. Allowed: ${allowed.join(', ')}`);
  }
}

/**
 * Upload file using AWS S3 signed URL flow
 * Returns relativePath to send to backend
 */
export async function uploadWithSignedUrl(
  file: File,
  folder: UploadFolder,
  onProgress?: (message: string, progress: number) => void
): Promise<string> {
  const baseUrl = getBaseUrl();
  const token = localStorage.getItem('access_token');

  if (!token) {
    throw new Error('No authentication token found');
  }

  // Validate file before upload
  validateFile(file, folder);

  try {
    // Step 1: Get signed URL from backend
    onProgress?.('Getting upload URL...', 10);
    
    const contentType = file.type || 'application/octet-stream';
    const params = new URLSearchParams({
      folder,
      fileName: file.name,
      contentType,
      fileSize: file.size.toString()
    });

    const signedUrlResponse = await fetch(`${baseUrl}/upload/get-signed-url?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!signedUrlResponse.ok) {
      const error = await signedUrlResponse.json().catch(() => ({}));
      throw new Error(error.message || 'Failed to get signed URL');
    }

    const signedUrlData: SignedUrlResponse = await signedUrlResponse.json();
    const { uploadUrl, relativePath, fields, publicUrl } = signedUrlData;

    // Step 2: Upload file to AWS S3 using POST with FormData
    onProgress?.('Uploading file...', 50);
    
    if (!fields || typeof fields !== 'object' || Object.keys(fields).length === 0) {
      throw new Error('Backend did not return required S3 fields. Backend migration may be incomplete.');
    }

    console.log('📤 Uploading to AWS S3 using POST method');
    const formData = new FormData();
    
    // CRITICAL: Add all fields from backend BEFORE the file
    // The order matters for S3 signature validation
    Object.keys(fields).forEach(key => {
      formData.append(key, fields[key]);
    });
    
    // Add file LAST
    formData.append('file', file);

    // DO NOT set Content-Type header - browser sets it automatically with boundary
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
      // No headers - let browser handle Content-Type with multipart boundary
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text().catch(() => 'Unknown error');
      console.error('S3 upload error:', errorText);
      throw new Error(`S3 upload failed (${uploadResponse.status}): ${errorText || uploadResponse.statusText}`);
    }
    
    console.log('✅ File uploaded to S3 successfully');

    // Step 3: Verify and make file public
    onProgress?.('Verifying upload...', 80);

    const verifyResponse = await fetch(`${baseUrl}/upload/verify-and-publish`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ relativePath })
    });

    if (!verifyResponse.ok) {
      const verifyError = await verifyResponse.json().catch(() => ({}));
      throw new Error(verifyError.message || 'Failed to verify upload');
    }

    const verifyData = await verifyResponse.json();
    console.log('✅ File verified and published:', verifyData.publicUrl || publicUrl);

    onProgress?.('Upload complete!', 100);

    // Return relativePath to be sent to backend
    return relativePath;
  } catch (error: any) {
    console.error('Upload failed:', error);
    throw new Error(error.message || 'Failed to upload file');
  }
}

/**
 * Upload with automatic folder detection
 */
export async function uploadFileAuto(
  file: File,
  onProgress?: (message: string, progress: number) => void
): Promise<string> {
  const folder = detectFolder(file);
  return uploadWithSignedUrl(file, folder, onProgress);
}
