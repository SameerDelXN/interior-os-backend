// =============================================================================
// InteriorOS Backend — Projects File Management Upload API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { getOrganizationId } from '@/middlewares/auth.middleware';
import { withProjectPermission } from '@/middlewares/project-auth.middleware';
import { connectDB } from '@/lib/db';
import { ProjectFile } from '@/models/project-file.model';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';
import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';

async function uploadFileHandler(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> },
  auth: JwtPayload
) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const parentIdParam = formData.get('parentId') as string | null;

    if (!file) {
      return errorResponse('No file provided', 400);
    }

    // Limit size to 25MB (26,214,400 bytes)
    if (file.size > 26214400) {
      return errorResponse('File size exceeds the 25MB limit', 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = file.name || 'document.pdf';

    let parentId: mongoose.Types.ObjectId | null = null;
    if (parentIdParam && parentIdParam !== 'null' && parentIdParam !== 'root' && parentIdParam !== '') {
      if (mongoose.Types.ObjectId.isValid(parentIdParam)) {
        parentId = new mongoose.Types.ObjectId(parentIdParam);
      } else {
        return errorResponse('Invalid parentId parameter', 400);
      }
    }

    let fileUrl = '';
    
    // Check if Cloudinary is configured
    const isCloudinaryConfigured = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );

    if (isCloudinaryConfigured) {
      fileUrl = await uploadToCloudinary(buffer, 'files', filename);
    } else {
      // Local file fallback
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'files');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const safeFilename = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const filePath = path.join(uploadDir, safeFilename);
      fs.writeFileSync(filePath, buffer);
      
      const host = req.headers.get('host') || 'localhost:3000';
      const proto = req.headers.get('x-forwarded-proto') || 'http';
      fileUrl = `${proto}://${host}/uploads/files/${safeFilename}`;
    }

    // Create the ProjectFile document
    const projectFile = await ProjectFile.create({
      organizationId,
      projectId,
      name: filename,
      type: 'file',
      parentId,
      fileUrl,
      fileType: file.type || path.extname(filename).toLowerCase().replace('.', '') || 'unknown',
      fileSize: file.size,
      uploadedBy: auth.userId,
    });

    return successResponse(projectFile, 'File uploaded successfully');
  } catch (error) {
    console.error('File upload API error:', error);
    return serverErrorResponse();
  }
}

export const POST = withProjectPermission('filemgt', 'create', uploadFileHandler);
