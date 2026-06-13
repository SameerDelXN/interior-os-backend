// =============================================================================
// InteriorOS Backend — AWS S3 Client
// =============================================================================

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@/config/env';
import { randomUUID } from 'crypto';

const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export interface UploadUrlResult {
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
}

/**
 * Generate a pre-signed URL for uploading a file to S3
 */
export async function generateUploadUrl(
  folder: string,
  fileName: string,
  contentType: string,
  organizationId: string
): Promise<UploadUrlResult> {
  const ext = fileName.split('.').pop() || '';
  const fileKey = `${organizationId}/${folder}/${randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: fileKey,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: env.AWS_S3_SIGNED_URL_EXPIRY,
  });

  const publicUrl = `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${fileKey}`;

  return { uploadUrl, fileKey, publicUrl };
}

/**
 * Generate a pre-signed URL for downloading a file from S3
 */
export async function generateDownloadUrl(fileKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: fileKey,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: env.AWS_S3_SIGNED_URL_EXPIRY,
  });
}

/**
 * Delete a file from S3
 */
export async function deleteFile(fileKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: fileKey,
  });

  await s3Client.send(command);
}

export { s3Client };
