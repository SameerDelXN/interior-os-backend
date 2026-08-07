// =============================================================================
// InteriorOS Backend — CRM Activities API: List & Create
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { connectDB } from '@/lib/db';
import { CrmActivity } from '@/models/crm-activity.model';
import { successResponse, createdResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';

// GET: List activities for a customer
async function getActivitiesHandler(req: NextRequest, _context: any, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);

    const searchParams = req.nextUrl.searchParams;
    const customerId = searchParams.get('customerId');

    if (!customerId) {
      return errorResponse('Customer ID is required', 400);
    }

    const activities = await CrmActivity.find({
      customer: customerId,
      organizationId,
    })
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 });

    return successResponse(activities);
  } catch (error) {
    console.error('List CRM activities error:', error);
    return serverErrorResponse();
  }
}

import { z } from 'zod';

const createActivitySchema = z.object({
  customer: z.string().min(1, 'Customer ID is required'),
  type: z.string().min(1, 'Activity type is required'),
  status: z.enum(['Pending', 'Completed', 'Missed']).optional().default('Pending'),
  scheduledDate: z.coerce.date().optional(),
  remarks: z.string().trim().min(2, 'Remarks/notes are required'),
});

// POST: Create a new activity/follow-up
async function createActivityHandler(req: NextRequest, _context: any, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const data = await req.json();

    const validation = createActivitySchema.safeParse(data);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, 400);
    }

    const validData = validation.data;
    const activity: any = await CrmActivity.create({
      ...validData,
      type: validData.type as any,
      user: auth.userId,
      organizationId,
      completedDate: validData.status === 'Completed' ? new Date() : undefined,
    });

    if (activity && typeof activity.populate === 'function') {
      await activity.populate('user', 'firstName lastName email');
    }
    return createdResponse(activity, 'Activity created successfully');
  } catch (error: any) {
    console.error('Create CRM activity error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return errorResponse(messages.join(', '), 400);
    }

    return serverErrorResponse();
  }
}

export const GET = withAuth(getActivitiesHandler);
export const POST = withAuth(createActivityHandler);
