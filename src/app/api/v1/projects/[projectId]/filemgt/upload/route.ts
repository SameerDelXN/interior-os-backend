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

    const body = await req.json();
    const { fileUrl, name, size, type, parentId: parentIdParam } = body;

    if (!fileUrl || !name) {
      return errorResponse('fileUrl and name are required', 400);
    }

    let parentId: mongoose.Types.ObjectId | null = null;
    if (parentIdParam && parentIdParam !== 'null' && parentIdParam !== 'root' && parentIdParam !== '') {
      if (mongoose.Types.ObjectId.isValid(parentIdParam)) {
        parentId = new mongoose.Types.ObjectId(parentIdParam);
      } else {
        return errorResponse('Invalid parentId parameter', 400);
      }
    }

    // Create the ProjectFile document
    const projectFile = await ProjectFile.create({
      organizationId,
      projectId,
      name,
      type: 'file',
      parentId,
      fileUrl,
      fileType: type || 'unknown',
      fileSize: size || 0,
      uploadedBy: auth.userId,
    });

    return successResponse(projectFile, 'File uploaded successfully');
  } catch (error) {
    console.error('File upload API error:', error);
    return serverErrorResponse();
  }
}

export const POST = withProjectPermission('filemgt', 'create', uploadFileHandler);
