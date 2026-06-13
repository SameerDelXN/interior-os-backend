// =============================================================================
// InteriorOS Backend — Snags API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { withProjectPermission } from '@/middlewares/project-auth.middleware';
import { connectDB } from '@/lib/db';
import { Snag } from '@/models/snag.model';
import { successResponse, createdResponse, serverErrorResponse, errorResponse, notFoundResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';

// GET: Retrieve all snags for the project
async function getSnagsHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;

    const snags = await Snag.find({ projectId, organizationId }).sort({ createdAt: -1 });
    return successResponse(snags);
  } catch (error) {
    console.error('Get snags error:', error);
    return serverErrorResponse();
  }
}

// POST: Log a new snag
async function createSnagHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;
    const body = await req.json();

    const { description } = body;
    if (!description) {
      return errorResponse('description is required', 400);
    }

    const snag = new Snag({
      ...body,
      projectId,
      organizationId,
      dueDate: body.dueDate || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // default 5 days
    });

    await snag.save();
    return createdResponse(snag, 'Snag logged successfully');
  } catch (error) {
    console.error('Create snag error:', error);
    return serverErrorResponse();
  }
}

// PUT: Resolve or close snag
async function updateSnagHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;
    const body = await req.json();

    const { snagId, status, assignee } = body;
    if (!snagId) {
      return errorResponse('snagId is required', 400);
    }

    const snag = await Snag.findOne({ _id: snagId, projectId, organizationId });
    if (!snag) {
      return notFoundResponse('Snag not found');
    }

    if (status) snag.status = status;
    if (assignee) snag.assignee = assignee;

    await snag.save();
    return successResponse(snag, 'Snag status updated successfully');
  } catch (error) {
    console.error('Update snag error:', error);
    return serverErrorResponse();
  }
}

export const GET = withProjectPermission('snags', 'read', getSnagsHandler);
export const POST = withProjectPermission('snags', 'create', createSnagHandler);
export const PUT = withProjectPermission('snags', 'update', updateSnagHandler);
