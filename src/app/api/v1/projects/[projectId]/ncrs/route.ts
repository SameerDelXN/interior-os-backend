// =============================================================================
// InteriorOS Backend — NCRs API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { connectDB } from '@/lib/db';
import { NCR } from '@/models/ncr.model';
import { successResponse, createdResponse, serverErrorResponse, errorResponse, notFoundResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';

// GET: Retrieve all NCRs for the project
async function getNcrsHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;

    const ncrs = await NCR.find({ projectId, organizationId }).sort({ createdAt: -1 });
    return successResponse(ncrs);
  } catch (error) {
    console.error('Get NCRs error:', error);
    return serverErrorResponse();
  }
}

// POST: Log a new NCR
async function createNcrHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;
    const body = await req.json();

    const { description } = body;
    if (!description) {
      return errorResponse('description is required', 400);
    }

    const count = await NCR.countDocuments({ organizationId });
    const ncrNumber = `NCR-2026-${String(count + 1).padStart(3, '0')}`;

    const ncr = new NCR({
      ...body,
      ncrNumber,
      projectId,
      organizationId,
      status: body.status || 'open',
    });

    await ncr.save();
    return createdResponse(ncr, 'Non-Conformance Report logged successfully');
  } catch (error) {
    console.error('Create NCR error:', error);
    return serverErrorResponse();
  }
}

// PUT: Update NCR root cause or status
async function updateNcrHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;
    const body = await req.json();

    const { ncrId, status, rootCause, correctiveAction, description } = body;
    if (!ncrId) {
      return errorResponse('ncrId is required', 400);
    }

    const ncr = await NCR.findOne({ _id: ncrId, projectId, organizationId });
    if (!ncr) {
      return notFoundResponse('NCR not found');
    }

    if (description) ncr.description = description;
    if (status) ncr.status = status;
    if (rootCause) ncr.rootCause = rootCause;
    if (correctiveAction) ncr.correctiveAction = correctiveAction;

    await ncr.save();
    return successResponse(ncr, 'NCR updated successfully');
  } catch (error) {
    console.error('Update NCR error:', error);
    return serverErrorResponse();
  }
}

export const GET = withAuth(getNcrsHandler);
export const POST = withAuth(createNcrHandler);
export const PUT = withAuth(updateNcrHandler);

// DELETE: Remove an NCR
async function deleteNcrHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;
    
    const searchParams = req.nextUrl.searchParams;
    const ncrId = searchParams.get('ncrId');

    if (!ncrId) {
      return errorResponse('ncrId is required', 400);
    }

    const ncr = await NCR.findOneAndDelete({ _id: ncrId, projectId, organizationId });
    if (!ncr) {
      return notFoundResponse('NCR not found');
    }

    return successResponse(null, 'NCR deleted successfully');
  } catch (error) {
    console.error('Delete NCR error:', error);
    return serverErrorResponse();
  }
}

export const DELETE = withAuth(deleteNcrHandler);
