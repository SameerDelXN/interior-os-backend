// =============================================================================
// InteriorOS Backend — Drawings API Route
// =============================================================================

import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { connectDB } from '@/lib/db';
import { Drawing } from '@/models/drawing.model';
import { successResponse, createdResponse, serverErrorResponse, errorResponse, notFoundResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';

// GET: Retrieve all drawings for the project
async function getDrawingsHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;

    const drawings = await Drawing.find({ projectId, organizationId }).sort({ createdAt: -1 });
    return successResponse(drawings);
  } catch (error) {
    console.error('Get drawings error:', error);
    return serverErrorResponse();
  }
}

// POST: Create/Upload a new drawing
async function createDrawingHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;
    const body = await req.json();

    const { title, discipline, fileUrl } = body;
    if (!title || !discipline || !fileUrl) {
      return errorResponse('title, discipline, and fileUrl are required', 400);
    }

    const count = await Drawing.countDocuments({ organizationId });
    const drawingNumber = `DWG-${discipline.toUpperCase()}-${String(count + 1).padStart(3, '0')}`;

    const newDrawing = new Drawing({
      projectId,
      organizationId,
      drawingNumber,
      title,
      discipline,
      status: 'submitted',
      revisions: [
        {
          revision: 'Rev 0',
          url: fileUrl,
          uploadedBy: new mongoose.Types.ObjectId(auth.userId),
          changes: 'Initial release',
          createdAt: new Date(),
        },
      ],
    });

    await newDrawing.save();
    return createdResponse(newDrawing, 'Drawing submitted successfully');
  } catch (error) {
    console.error('Create drawing error:', error);
    return serverErrorResponse();
  }
}

// PUT: Approve/reject or update revision
async function updateDrawingHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;
    const body = await req.json();

    const { drawingId, status, fileUrl, changes, revisionName } = body;
    if (!drawingId) {
      return errorResponse('drawingId is required', 400);
    }

    const drawing = await Drawing.findOne({ _id: drawingId, projectId, organizationId });
    if (!drawing) {
      return notFoundResponse('Drawing not found');
    }

    // If uploading a new revision
    if (fileUrl && revisionName) {
      drawing.revisions.push({
        revision: revisionName,
        url: fileUrl,
        uploadedBy: new mongoose.Types.ObjectId(auth.userId),
        changes: changes || '',
        createdAt: new Date(),
      });
      drawing.status = 'submitted';
    }

    // If updating approval status
    if (status) {
      drawing.status = status;
    }

    await drawing.save();
    return successResponse(drawing, 'Drawing updated successfully');
  } catch (error) {
    console.error('Update drawing error:', error);
    return serverErrorResponse();
  }
}

export const GET = withAuth(getDrawingsHandler);
export const POST = withAuth(createDrawingHandler);
export const PUT = withAuth(updateDrawingHandler);
