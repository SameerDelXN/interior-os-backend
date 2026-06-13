// =============================================================================
// InteriorOS Backend — Handover API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { connectDB } from '@/lib/db';
import { Handover } from '@/models';
import { successResponse, createdResponse, serverErrorResponse, errorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';

// GET: Retrieve handover status and checklist for the project
async function getHandoverHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;

    let handover = await Handover.findOne({ projectId, organizationId });

    // Auto-initialize standard closeout checklist if empty
    if (!handover) {
      handover = new Handover({
        projectId,
        organizationId,
        completionPercentage: 0,
        checklist: [
          { task: 'Snag list rectification verify', status: 'pending' },
          { task: 'As-Built drawings submission & approval', status: 'pending' },
          { task: 'O&M manuals catalog upload', status: 'pending' },
          { task: 'NOC certificate from MEP consultants', status: 'pending' },
          { task: 'Warranty certificates registration', status: 'pending' },
          { task: 'Keys & site physical takeover handoff', status: 'pending' },
        ],
        documents: [],
      });
      await handover.save();
    }

    return successResponse(handover);
  } catch (error) {
    console.error('Get handover error:', error);
    return serverErrorResponse();
  }
}

// POST: Update checklist status or upload handover closeout documents
async function updateHandoverHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;
    const body = await req.json();

    const { taskName, status, documentName, documentUrl, documentType, checklist } = body;

    let handover = await Handover.findOne({ projectId, organizationId });
    if (!handover) {
      return errorResponse('Handover record not initialized', 404);
    }

    // Update entire checklist structure
    if (Array.isArray(checklist)) {
      const oldChecklist = handover.checklist;
      handover.checklist = checklist.map((item: any) => {
        const existing = oldChecklist.find(o => o.task === item.task);
        return {
          task: item.task,
          status: existing ? existing.status : (item.status || 'pending'),
          completedAt: existing ? existing.completedAt : (item.status === 'completed' ? new Date() : undefined),
        } as any;
      });
    }

    // Toggle checklist task status
    if (taskName && status) {
      const item = handover.checklist.find(c => c.task === taskName);
      if (item) {
        item.status = status;
        item.completedAt = status === 'completed' ? new Date() : undefined;
      }
    }

    // Add document closeout warranty/manual/cert
    if (documentName && documentUrl && documentType) {
      handover.documents.push({
        name: documentName,
        url: documentUrl,
        type: documentType,
        uploadedAt: new Date(),
      });
    }

    // Re-calculate completion percentage
    const total = handover.checklist.length;
    const completed = handover.checklist.filter(c => c.status === 'completed').length;
    handover.completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    await handover.save();
    return successResponse(handover, 'Handover state updated successfully');
  } catch (error) {
    console.error('Update handover error:', error);
    return serverErrorResponse();
  }
}

export const GET = withAuth(getHandoverHandler);
export const POST = withAuth(updateHandoverHandler);
