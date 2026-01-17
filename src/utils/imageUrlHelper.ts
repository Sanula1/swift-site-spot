/**
 * Transform image URLs to use the storage.suraksha.lk base URL
 * Handles AWS S3, GCS, or relative paths and converts them to the correct format
 */
export const getImageUrl = (imageUrl: string | null | undefined): string => {
  if (!imageUrl) return '';
  
  const STORAGE_BASE_URL = 'https://storage.suraksha.lk';
  
  // If already using storage.suraksha.lk, return as is
  if (imageUrl.startsWith(STORAGE_BASE_URL)) {
    return imageUrl;
  }
  
  // If it's a relative path (no protocol), prepend base URL
  if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
    // Remove leading slash if present
    const relativePath = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
    return `${STORAGE_BASE_URL}/${relativePath}`;
  }
  
  // Extract relative path from AWS S3 URLs
  // Format: https://bucket-name.s3.region.amazonaws.com/path/to/file
  const s3Match = imageUrl.match(/https?:\/\/[^\/]+\.s3[^\/]*\.amazonaws\.com\/(.+)$/);
  if (s3Match) {
    // Remove query string if present
    const path = s3Match[1].split('?')[0];
    return `${STORAGE_BASE_URL}/${path}`;
  }
  
  // Extract relative path from GCS URLs
  // Format: https://storage.googleapis.com/bucket-name/path/to/file
  const gcsMatch = imageUrl.match(/https?:\/\/storage\.googleapis\.com\/[^\/]+\/(.+)$/);
  if (gcsMatch) {
    // Remove query string if present
    const path = gcsMatch[1].split('?')[0];
    return `${STORAGE_BASE_URL}/${path}`;
  }
  
  // Extract relative path from direct GCS bucket URLs
  // Format: https://bucket-name.storage.googleapis.com/path/to/file
  const gcsBucketMatch = imageUrl.match(/https?:\/\/[^\/]+\.storage\.googleapis\.com\/(.+)$/);
  if (gcsBucketMatch) {
    // Remove query string if present
    const path = gcsBucketMatch[1].split('?')[0];
    return `${STORAGE_BASE_URL}/${path}`;
  }
  
  // If no pattern matches, try to extract path after the domain
  try {
    const url = new URL(imageUrl);
    const pathWithoutLeadingSlash = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
    if (pathWithoutLeadingSlash) {
      return `${STORAGE_BASE_URL}/${pathWithoutLeadingSlash}`;
    }
  } catch {
    // If URL parsing fails, return original
  }
  
  return imageUrl;
};
