// =============================================================================
// InteriorOS Backend — Invite AI Bot to Meeting Route
// =============================================================================

import { NextRequest } from 'next/server';
import { withProjectPermission } from '@/middlewares/project-auth.middleware';
import { successResponse, serverErrorResponse, errorResponse } from '@/lib/api-response';
import { inviteBotToMeeting } from '@/services/mom.service';
import type { JwtPayload } from '@/lib/jwt';
import { getOrganizationId } from '@/middlewares/auth.middleware';

async function inviteBotHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    const { projectId } = await context.params;
    const organizationId = getOrganizationId(auth);
    const body = await req.json();

    const { meetingUrl } = body;
    if (!meetingUrl) {
      return errorResponse('meetingUrl is required', 400);
    }

    const pendingMom = await inviteBotToMeeting(projectId, organizationId, meetingUrl);
    
    return successResponse(pendingMom, 'AI Bot has been dispatched to the meeting.');
  } catch (error: any) {
    console.error('Invite bot error:', error);
    return errorResponse(error.message || 'Failed to invite bot', 500);
  }
}

export const POST = withProjectPermission('mom', 'create', inviteBotHandler);
