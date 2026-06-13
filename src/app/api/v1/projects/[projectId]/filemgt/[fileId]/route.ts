// =============================================================================
// InteriorOS Backend — Projects File Management Delete API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { getOrganizationId } from '@/middlewares/auth.middleware';
import { withProjectPermission } from '@/middlewares/project-auth.middleware';
import { connectDB } from '@/lib/db';
import { ProjectFile } from '@/models/project-file.model';
import { successResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';

// Helper to recursively soft-delete folders and files
async function recursiveSoftDelete(itemId: string, organizationId: any) {
  const item = await ProjectFile.findOne({ _id: itemId, organizationId, isDeleted: false });
  if (!item) return;

  // Soft-delete the current item
  item.isDeleted = true;
  item.deletedAt = new Date();
  await item.save();

  // If it's a folder, find all child folder/files and soft-delete them recursively
  if (item.type === 'folder') {
    const children = await ProjectFile.find({ parentId: item._id, organizationId, isDeleted: false });
    for (const child of children) {
      await recursiveSoftDelete(child._id.toString(), organizationId);
    }
  }
}

async function deleteFileHandler(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> },
  auth: JwtPayload
) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId, fileId } = await context.params;

    const file = await ProjectFile.findOne({ _id: fileId, projectId, organizationId, isDeleted: false });
    if (!file) {
      return notFoundResponse('File or folder not found');
    }

    // Recursively soft-delete this item and any nested items
    await recursiveSoftDelete(fileId, organizationId);

    return successResponse(null, `${file.type === 'folder' ? 'Folder' : 'File'} deleted successfully`);
  } catch (error) {
    console.error('Delete project file/folder error:', error);
    return serverErrorResponse();
  }
}

export const DELETE = withProjectPermission('filemgt', 'delete', deleteFileHandler);
