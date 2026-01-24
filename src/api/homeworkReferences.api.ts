import { apiClient, ApiResponse } from './client';

// =================== TYPES ===================

export type ReferenceType = 'VIDEO' | 'IMAGE' | 'PDF' | 'DOCUMENT' | 'LINK' | 'AUDIO' | 'OTHER';
export type ReferenceSource = 'S3_UPLOAD' | 'GOOGLE_DRIVE' | 'MANUAL_LINK';

export interface HomeworkReference {
  id: string;
  homeworkId: string;
  uploadedById?: string;
  
  // Metadata
  title: string;
  description?: string;
  referenceType: ReferenceType;
  referenceSource: ReferenceSource;
  displayOrder: number;
  
  // S3 Fields
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  
  // Google Drive Fields
  driveFileId?: string;
  driveFileName?: string;
  driveMimeType?: string;
  driveFileSize?: number;
  
  // Manual Link Fields
  externalUrl?: string;
  linkTitle?: string;
  
  // Video Fields
  videoDuration?: number;
  thumbnailUrl?: string;
  
  // URLs (computed)
  viewUrl?: string;
  driveViewUrl?: string;
  driveDownloadUrl?: string;
  driveEmbedUrl?: string;
  
  // Status
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  
  // Uploader info
  uploadedBy?: {
    id: string;
    nameWithInitials?: string;
    email?: string;
  };
}

export interface ReferenceQueryParams {
  homeworkId?: string;
  referenceType?: ReferenceType;
  referenceSource?: ReferenceSource;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface S3UploadUrlRequest {
  homeworkId: string;
  fileName: string;
  contentType: string;
  fileSize: number;
  referenceType: ReferenceType;
}

export interface S3UploadUrlResponse {
  uploadUrl: string;
  relativePath: string;
  fields?: Record<string, string>;
  expiresIn: number;
  maxFileSize?: number;
}

export interface S3ConfirmUploadData {
  homeworkId: string;
  title: string;
  description?: string;
  referenceType: ReferenceType;
  relativePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  videoDuration?: number;
}

export interface GoogleDriveReferenceData {
  homeworkId: string;
  title: string;
  description?: string;
  referenceType: ReferenceType;
  driveFileId: string;
  accessToken: string;
}

export interface LinkReferenceData {
  homeworkId: string;
  title: string;
  description?: string;
  referenceType: ReferenceType;
  externalUrl: string;
  linkTitle?: string;
  videoDuration?: number;
}

export interface ReferenceSummary {
  total: number;
  byType: Record<ReferenceType, number>;
  bySource: Record<ReferenceSource, number>;
}

// =================== API CLASS ===================

class HomeworkReferencesApi {
  private basePath = '/homework-references';

  // =================== READ OPERATIONS ===================

  /**
   * Get all references with filtering and pagination
   * GET /homework-references?homeworkId={homeworkId}
   */
  async getReferences(params?: ReferenceQueryParams): Promise<ApiResponse<HomeworkReference[]>> {
    console.log('📎 Fetching homework references:', params);
    return apiClient.get<ApiResponse<HomeworkReference[]>>(this.basePath, params);
  }

  /**
   * Get references for a specific homework
   * GET /homework-references/homework/{homeworkId}
   */
  async getReferencesByHomework(homeworkId: string): Promise<HomeworkReference[]> {
    console.log('📎 Fetching references for homework:', homeworkId);
    return apiClient.get<HomeworkReference[]>(`${this.basePath}/homework/${homeworkId}`);
  }

  /**
   * Get a single reference by ID
   * GET /homework-references/{id}
   */
  async getReferenceById(id: string): Promise<HomeworkReference> {
    console.log('📎 Fetching reference:', id);
    return apiClient.get<HomeworkReference>(`${this.basePath}/${id}`);
  }

  /**
   * Get reference summary for a homework
   */
  async getReferenceSummary(homeworkId: string): Promise<ReferenceSummary> {
    console.log('📊 Fetching reference summary for homework:', homeworkId);
    return apiClient.get<ReferenceSummary>(`${this.basePath}/homework/${homeworkId}/summary`);
  }

  // =================== S3 UPLOAD FLOW ===================

  /**
   * Step 1: Generate S3 upload URL
   * POST /homework-references/upload/generate-url
   */
  async generateUploadUrl(data: S3UploadUrlRequest): Promise<S3UploadUrlResponse> {
    console.log('🔗 Generating S3 upload URL:', data);
    return apiClient.post<S3UploadUrlResponse>(`${this.basePath}/upload/generate-url`, data);
  }

  /**
   * Step 2: Upload file to S3 using signed URL
   */
  async uploadToS3(uploadUrl: string, file: File, fields?: Record<string, string>): Promise<void> {
    console.log('⬆️ Uploading file to S3:', file.name);
    
    if (fields && Object.keys(fields).length > 0) {
      // POST with form data (presigned POST)
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append('file', file);

      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file to S3');
      }
    } else {
      // PUT with binary data (presigned PUT URL)
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to upload file to S3');
      }
    }
    
    console.log('✅ File uploaded to S3 successfully');
  }

  /**
   * Step 3: Confirm S3 upload and create reference
   * POST /homework-references/upload/confirm
   */
  async confirmS3Upload(data: S3ConfirmUploadData): Promise<HomeworkReference> {
    console.log('✅ Confirming S3 upload:', data);
    return apiClient.post<HomeworkReference>(`${this.basePath}/upload/confirm`, data);
  }

  /**
   * Complete S3 upload workflow (generate URL → upload → confirm)
   */
  async uploadFileToS3(
    homeworkId: string,
    file: File,
    title: string,
    referenceType: ReferenceType,
    description?: string,
    onProgress?: (progress: number) => void
  ): Promise<HomeworkReference> {
    console.log('📤 Starting S3 upload workflow:', { homeworkId, fileName: file.name, referenceType });

    // Step 1: Generate upload URL
    onProgress?.(10);
    const { uploadUrl, relativePath, fields } = await this.generateUploadUrl({
      homeworkId,
      fileName: file.name,
      contentType: file.type,
      fileSize: file.size,
      referenceType,
    });

    // Step 2: Upload to S3
    onProgress?.(30);
    await this.uploadToS3(uploadUrl, file, fields);
    onProgress?.(80);

    // Step 3: Confirm upload
    const reference = await this.confirmS3Upload({
      homeworkId,
      title,
      description,
      referenceType,
      relativePath,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });

    onProgress?.(100);
    console.log('✅ S3 upload workflow completed:', reference);
    return reference;
  }

  // =================== GOOGLE DRIVE ===================

  /**
   * Create reference from Google Drive
   * POST /homework-references/google-drive
   */
  async createFromGoogleDrive(data: GoogleDriveReferenceData): Promise<HomeworkReference> {
    console.log('📁 Creating reference from Google Drive:', data);
    return apiClient.post<HomeworkReference>(`${this.basePath}/google-drive`, data);
  }

  // =================== EXTERNAL LINK ===================

  /**
   * Create reference from external link
   * POST /homework-references/link
   */
  async createFromLink(data: LinkReferenceData): Promise<HomeworkReference> {
    console.log('🔗 Creating reference from link:', data);
    return apiClient.post<HomeworkReference>(`${this.basePath}/link`, data);
  }

  // =================== UPDATE OPERATIONS ===================

  /**
   * Update reference
   * PATCH /homework-references/{id}
   */
  async updateReference(id: string, data: Partial<{
    title: string;
    description: string;
    displayOrder: number;
  }>): Promise<HomeworkReference> {
    console.log('✏️ Updating reference:', id, data);
    return apiClient.patch<HomeworkReference>(`${this.basePath}/${id}`, data);
  }

  /**
   * Reorder references
   * PATCH /homework-references/homework/{homeworkId}/reorder
   */
  async reorderReferences(homeworkId: string, referenceIds: string[]): Promise<void> {
    console.log('🔀 Reordering references:', { homeworkId, referenceIds });
    return apiClient.patch<void>(`${this.basePath}/homework/${homeworkId}/reorder`, { referenceIds });
  }

  // =================== DELETE OPERATIONS ===================

  /**
   * Soft delete reference (Teacher/Admin)
   * DELETE /homework-references/{id}
   */
  async deleteReference(id: string): Promise<void> {
    console.log('🗑️ Soft deleting reference:', id);
    return apiClient.delete<void>(`${this.basePath}/${id}`);
  }

  /**
   * Permanent delete reference - removes S3 file (Institute Admin Only)
   * DELETE /homework-references/{id}/permanent
   */
  async permanentDeleteReference(id: string): Promise<void> {
    console.log('🗑️ Permanently deleting reference:', id);
    return apiClient.delete<void>(`${this.basePath}/${id}/permanent`);
  }

  /**
   * Restore deleted reference (Teacher/Admin)
   * PATCH /homework-references/{id}/restore
   */
  async restoreReference(id: string): Promise<HomeworkReference> {
    console.log('♻️ Restoring reference:', id);
    return apiClient.patch<HomeworkReference>(`${this.basePath}/${id}/restore`, {});
  }

  /**
   * Bulk soft delete references
   */
  async bulkDeleteReferences(ids: string[]): Promise<void> {
    console.log('🗑️ Bulk deleting references:', ids);
    return apiClient.post<void>(`${this.basePath}/bulk-delete`, { ids });
  }
}

export const homeworkReferencesApi = new HomeworkReferencesApi();

// =================== UTILITY FUNCTIONS ===================

export function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

export function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export function getReferenceTypeIcon(type: ReferenceType): string {
  const icons: Record<ReferenceType, string> = {
    VIDEO: '🎬',
    IMAGE: '🖼️',
    PDF: '📄',
    DOCUMENT: '📝',
    LINK: '🔗',
    AUDIO: '🎵',
    OTHER: '📁',
  };
  return icons[type] || '📁';
}

export function getAcceptedFileTypes(referenceType: ReferenceType): string {
  const types: Record<ReferenceType, string> = {
    VIDEO: 'video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo,video/x-ms-wmv',
    IMAGE: 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/bmp',
    PDF: 'application/pdf',
    DOCUMENT: '.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain,application/rtf',
    AUDIO: 'audio/mpeg,audio/wav,audio/ogg,audio/webm,audio/aac,audio/mp4',
    LINK: '',
    OTHER: '*',
  };
  return types[referenceType] || '*';
}

export function getMaxFileSize(referenceType: ReferenceType): number {
  const sizes: Record<ReferenceType, number> = {
    VIDEO: 500 * 1024 * 1024, // 500 MB
    IMAGE: 10 * 1024 * 1024,  // 10 MB
    PDF: 50 * 1024 * 1024,    // 50 MB
    DOCUMENT: 50 * 1024 * 1024, // 50 MB
    AUDIO: 100 * 1024 * 1024, // 100 MB
    LINK: 0,
    OTHER: 100 * 1024 * 1024, // 100 MB
  };
  return sizes[referenceType] || 100 * 1024 * 1024;
}

export function detectReferenceType(file: File): ReferenceType {
  const mimeType = file.type.toLowerCase();
  
  if (mimeType.startsWith('video/')) return 'VIDEO';
  if (mimeType.startsWith('image/')) return 'IMAGE';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType.startsWith('audio/')) return 'AUDIO';
  if (
    mimeType.includes('document') ||
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('powerpoint') ||
    mimeType.includes('presentation') ||
    mimeType === 'text/plain' ||
    mimeType === 'application/rtf'
  ) {
    return 'DOCUMENT';
  }
  
  return 'OTHER';
}
