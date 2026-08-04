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

// POST: Create a new activity/follow-up
async function createActivityHandler(req: NextRequest, _context: any, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const data = await req.json();

    const activity = await CrmActivity.create({
      ...data,
      user: auth.userId,
      organizationId,
      completedDate: data.status === 'Completed' ? new Date() : undefined,
    });

    await activity.populate('user', 'firstName lastName email');
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
