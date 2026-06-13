// =============================================================================
// InteriorOS Backend — Cloudinary Client Utility
// =============================================================================

import { v2 as cloudinary } from 'cloudinary';
import { env } from '@/config/env';

// Configure Cloudinary only if variables are set
const isConfigured = !!(
  env.CLOUDINARY_CLOUD_NAME &&
  env.CLOUDINARY_API_KEY &&
  env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
} else {
  console.warn(
    '[Cloudinary] Warning: Cloudinary is not configured. File uploads will fallback to mock URLs.'
  );
}

/**
 * Upload a file buffer to Cloudinary
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer,
  folder: string,
  filename: string
): Promise<string> {
  if (!isConfigured) {
    console.warn('[Cloudinary] Using mock upload fallback because configuration is missing.');
    // Return a dummy PDF/Image URL path for mockup/dev testing
    return 'https://res.cloudinary.com/demo/image/upload/v1570979139/sample.jpg';
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `interioros/${folder}`,
        public_id: filename.split('.')[0] + '_' + Date.now(),
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) {
          console.error('[Cloudinary] Upload failed:', error);
          return reject(error);
        }
        resolve(result?.secure_url || '');
      }
    );

    uploadStream.end(fileBuffer);
  });
}

export { cloudinary };
