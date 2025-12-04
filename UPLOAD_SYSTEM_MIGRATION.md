# Upload System Migration - Complete Implementation

## 🎯 Overview

This application has been migrated from direct file uploads to a **signed URL upload system**. All file uploads now follow a 3-step process:

1. **Get signed URL** from backend
2. **Upload file directly** to cloud storage
3. **Verify and publish** the file
4. **Use public URL** in API calls

## ✅ What Has Been Implemented

### 1. Core Upload Utility (`src/utils/uploadHelper.ts`)

A comprehensive upload utility class with:
- File validation (size, type, extensions)
- Signed URL fetching
- Direct cloud storage upload
- File verification and publishing
- Progress tracking
- Retry logic
- Multiple file uploads
- Image compression helper

**Usage:**
```typescript
import { fileUploader } from '@/utils/uploadHelper';

// Basic upload
const publicUrl = await fileUploader.uploadFile(file, 'profile-images');

// Upload with progress tracking
const publicUrl = await fileUploader.uploadFile(
  file,
  'profile-images',
  (progress) => {
    console.log(`${progress.stage}: ${progress.progress}%`);
  }
);

// Upload with retry
const publicUrl = await fileUploader.uploadFileWithRetry(file, 'profile-images', 3);
```

### 2. Updated Components

#### Profile Image Upload (`src/components/ProfileImageUpload.tsx`)
- ✅ Uses signed URL upload system
- ✅ Shows upload progress
- ✅ Image cropping support
- ✅ Sends URL to backend (not file)

#### Institute Payment Submission (`src/components/forms/SubmitPaymentDialog.tsx`)
- ✅ Uploads receipt to `payment-receipts` folder
- ✅ Shows upload progress
- ✅ Sends receipt URL to backend

#### Subject Payment Submission (`src/components/forms/SubmitSubjectPaymentDialog.tsx`)
- ✅ Uploads receipt to `payment-receipts` folder
- ✅ Shows upload progress
- ✅ Sends receipt URL to backend

#### Homework Submission (`src/components/forms/SubmitHomeworkForm.tsx`)
- ✅ Uploads file to `homework-files` folder
- ✅ Shows upload progress
- ✅ Sends file URL to backend

### 3. Updated API Clients

#### Institute Payments API (`src/api/institutePayments.api.ts`)
- ✅ `submitPayment` now accepts `receiptUrl` instead of `File`
- ✅ Sends JSON body instead of FormData

#### Subject Payments API (`src/api/subjectPayments.api.ts`)
- ✅ `submitPayment` now accepts object with `receiptUrl`
- ✅ No longer uses FormData

#### Homework Submissions API (`src/api/homeworkSubmissions.api.ts`)
- ✅ `submitHomework` now accepts `fileUrl` as second parameter
- ✅ Optional `submissionData` parameter for date and remarks
- ✅ No longer uses FormData

## 📁 Supported Upload Folders

| Folder | Max Size | Allowed Types | Use Case |
|--------|----------|---------------|----------|
| `profile-images` | 5MB | PNG, JPEG, WebP | User profile pictures |
| `student-images` | 5MB | PNG, JPEG, WebP | Student photos |
| `institute-images` | 10MB | PNG, JPEG, WebP | Institute logos |
| `institute-user-images` | 5MB | PNG, JPEG, WebP | Institute-specific user images |
| `subject-images` | 5MB | PNG, JPEG, WebP | Subject thumbnails |
| `homework-files` | 20MB | PDF, DOCX, Images, ZIP | Homework submissions |
| `correction-files` | 20MB | PDF, Images | Teacher corrections |
| `payment-receipts` | 10MB | PDF, PNG, JPEG | Payment proof |
| `id-documents` | 10MB | PDF, PNG, JPEG | ID card images |

## 🔄 Migration Checklist

### Completed ✅
- [x] Created `uploadHelper.ts` utility
- [x] Updated `ProfileImageUpload.tsx`
- [x] Updated `SubmitPaymentDialog.tsx`
- [x] Updated `SubmitSubjectPaymentDialog.tsx`
- [x] Updated `SubmitHomeworkForm.tsx`
- [x] Updated `institutePayments.api.ts`
- [x] Updated `subjectPayments.api.ts`
- [x] Updated `homeworkSubmissions.api.ts`

### Remaining Components to Update ⏳

The following components may still need updating (if they exist):

1. **Institute Users** (`src/components/InstituteUsers.tsx`)
   - Line 213-225: Uses FormData for image upload
   - Needs: Update to use signed URL system

2. **Subject Creation** (`src/api/subjects.api.ts`)
   - Line 64: References FormData in comments
   - Check `CreateSubjectForm` component

3. **Organization/Institute Creation Forms**
   - May upload logos or images
   - Check for FormData usage

4. **Correction File Uploads**
   - Teachers uploading correction files
   - Should use `correction-files` folder

5. **ID Document Uploads**
   - If application has ID verification
   - Should use `id-documents` folder

## 🔍 How to Find Components to Update

Search for these patterns in your codebase:

```bash
# Find FormData usage
grep -r "new FormData()" src/

# Find file input elements
grep -r 'type="file"' src/

# Find file upload API calls
grep -r "multipart/form-data" src/

# Find components with file handling
grep -r "File\[\]\\|File |" src/
```

## 📝 How to Update a Component

### Step 1: Import Upload Helper
```typescript
import { fileUploader, UploadProgress } from '@/utils/uploadHelper';
```

### Step 2: Add Upload Progress State
```typescript
const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
  stage: 'idle',
  message: '',
  progress: 0
});
```

### Step 3: Update Submit Handler
```typescript
// OLD WAY ❌
const formData = new FormData();
formData.append('file', file);
await api.submit(formData);

// NEW WAY ✅
const fileUrl = await fileUploader.uploadFile(
  file,
  'appropriate-folder-name',
  (progress) => setUploadProgress(progress)
);

await api.submit({
  ...otherData,
  fileUrl // Send URL instead of file
});
```

### Step 4: Update API Client
```typescript
// OLD WAY ❌
async submit(formData: FormData) {
  return apiClient.post('/endpoint', formData);
}

// NEW WAY ✅
async submit(data: { fileUrl: string; otherFields: any }) {
  return apiClient.post('/endpoint', data);
}
```

### Step 5: Show Upload Progress (Optional)
```typescript
<Button disabled={loading}>
  {loading ? (uploadProgress.message || 'Uploading...') : 'Submit'}
</Button>
```

## 🛠️ Backend Integration

### Backend Endpoints Required

Your backend must provide these endpoints:

#### 1. Get Signed URL
```
GET /upload/get-signed-url
Query Params:
  - folder: string (required)
  - fileName: string (required)
  - contentType: string (required)
  - fileSize: number (required)
  - expiresIn: number (optional, default: 600)

Response:
{
  "success": true,
  "uploadUrl": "https://...",
  "publicUrl": "https://...",
  "relativePath": "folder/file-uuid.ext",
  "expiresAt": "2025-11-08T12:10:00.000Z"
}
```

#### 2. Verify and Publish
```
POST /upload/verify-and-publish
Body:
{
  "relativePath": "folder/file-uuid.ext"
}

Response:
{
  "success": true,
  "publicUrl": "https://...",
  "relativePath": "folder/file-uuid.ext"
}
```

#### 3. Update Entity APIs

All APIs that previously accepted files via FormData must now accept URLs:

```json
// OLD ❌
POST /users/profile (multipart/form-data with file)

// NEW ✅
PATCH /users/profile (application/json)
{
  "profileImageUrl": "https://..."
}
```

## 🧪 Testing Guide

### Manual Testing
1. Select a file
2. Verify file validation (size, type)
3. Upload file
4. Check progress indicator
5. Verify upload success
6. Check that URL is sent to backend
7. Verify file is accessible

### Console Logging
The upload helper logs all steps:
```
Upload attempt 1/3
Getting upload URL from server...
Uploading to cloud storage...
Verifying upload...
Upload successful!
```

### Error Testing
Test these scenarios:
- File too large
- Invalid file type
- Network failure during upload
- Expired signed URL
- Backend verification failure

## 📊 Benefits of New System

✅ **Zero backend bandwidth** for file uploads
✅ **Faster uploads** - direct to cloud storage
✅ **Better security** - short-lived signed URLs (10 min expiry)
✅ **Scalability** - no backend bottleneck
✅ **Cost optimization** - reduced server load
✅ **Progress tracking** - better UX
✅ **Retry logic** - more reliable uploads
✅ **Validation** - client-side file validation

## 🔒 Security Features

- ✅ File size limits per folder
- ✅ File type validation
- ✅ Suspicious extension detection
- ✅ Double extension prevention
- ✅ JWT authentication required
- ✅ Short-lived signed URLs (10 minutes)
- ✅ Server-side verification before publishing

## 🚨 Common Issues & Solutions

### Issue: "Upload failed with status 403"
**Solution:** Signed URL expired. This happens if upload takes > 10 minutes or URL is reused.

### Issue: "File not found during verification"
**Solution:** Upload to cloud failed or wrong relativePath sent to verify endpoint.

### Issue: TypeScript errors about FormData
**Solution:** Update API client interfaces to accept URLs instead of File objects.

### Issue: Upload progress not showing
**Solution:** Make sure you're passing progress callback to `uploadFile` method.

## 📚 Additional Resources

- [Upload Helper Documentation](src/utils/uploadHelper.ts)
- [Backend Documentation](FRONTEND_UPLOAD_INTEGRATION_GUIDE.md)
- [API Endpoints Reference](#backend-integration)

## 🎉 Summary

The upload system has been successfully migrated to use signed URLs. All major file upload flows (profile images, payment receipts, homework submissions) now use the new system. The implementation provides better performance, security, and user experience.

**Next Steps:**
1. Test all upload flows thoroughly
2. Update any remaining components with FormData usage
3. Monitor upload success rates
4. Optimize file sizes where needed (use image compression helper)
