// =============================================================================
// InteriorOS Backend — CRM Activity Detail API: PATCH / DELETE
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { connectDB } from '@/lib/db';
import { CrmActivity } from '@/models/crm-activity.model';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';
import mongoose from 'mongoose';
import { z } from 'zod';

const updateActivitySchema = z.object({
  status: z.enum(['Pending', 'Completed', 'Missed']).optional(),
  remarks: z.string().optional(),
  customerResponse: z.string().optional(),
  completedDate: z.coerce.date().optional(),
});

// PATCH: Update an activity (e.g. mark Completed)
async function updateActivityHandler(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> },
  auth: JwtPayload
) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { activityId } = await context.params;
    const data = await req.json();

    if (!mongoose.Types.ObjectId.isValid(activityId)) {
      return errorResponse('Invalid Activity ID', 400);
    }

    const validation = updateActivitySchema.safeParse(data);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, 400);
    }

    const updatePayload: any = { ...validation.data };
    if (updatePayload.status === 'Completed' && !updatePayload.completedDate) {
      updatePayload.completedDate = new Date();
    }

    const activity = await CrmActivity.findOneAndUpdate(
      { _id: activityId, organizationId },
      { $set: updatePayload },
      { new: true }
    );

    if (!activity) {
      return errorResponse('Activity not found', 404);
    }

    return successResponse(activity, 'Activity updated successfully');
  } catch (error) {
    console.error('Update CRM activity error:', error);
    return serverErrorResponse();
  }
}

export const PATCH = withAuth(updateActivityHandler);
