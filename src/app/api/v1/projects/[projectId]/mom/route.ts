// =============================================================================
// InteriorOS Backend — MOM API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { connectDB } from '@/lib/db';
import { MeetingMinutes } from '@/models/mom.model';
import { successResponse, createdResponse, serverErrorResponse, errorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';

// GET: Retrieve all meeting logs for the project
async function getMomsHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;

    const meetings = await MeetingMinutes.find({ projectId, organizationId }).sort({ date: -1 });
    return successResponse(meetings);
  } catch (error) {
    console.error('Get MOMs error:', error);
    return serverErrorResponse();
  }
}

// POST: Log a new meeting minutes
async function createMomHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;
    const body = await req.json();

    const { title, agenda, notes } = body;
    if (!title || !agenda || !notes) {
      return errorResponse('title, agenda, and notes are required', 400);
    }

    const newMeeting = new MeetingMinutes({
      ...body,
      projectId,
      organizationId,
    });

    await newMeeting.save();
    return createdResponse(newMeeting, 'Meeting minutes logged successfully');
  } catch (error) {
    console.error('Create MOM error:', error);
    return serverErrorResponse();
  }
}

export const GET = withAuth(getMomsHandler);
export const POST = withAuth(createMomHandler);
