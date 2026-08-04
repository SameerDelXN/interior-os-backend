// =============================================================================
// InteriorOS Backend — CRM Pending Follow-ups API
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { connectDB } from '@/lib/db';
import { CrmActivity } from '@/models/crm-activity.model';
import { successResponse, serverErrorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';

// GET: List pending follow-up activities
async function getPendingActivitiesHandler(req: NextRequest, _context: any, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);

    const pendingActivities = await CrmActivity.find({
      organizationId,
      status: 'Pending',
    })
      .populate({
        path: 'customer',
        select: 'name mobileNumber status assignedSalesExecutive',
        populate: { path: 'assignedSalesExecutive', select: 'firstName lastName email' },
      })
      .populate('user', 'firstName lastName email')
      .sort({ scheduledDate: 1 });

    return successResponse(pendingActivities);
  } catch (error) {
    console.error('Pending CRM follow-ups error:', error);
    return serverErrorResponse();
  }
}

export const GET = withAuth(getPendingActivitiesHandler);
