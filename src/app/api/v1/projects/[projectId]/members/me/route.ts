// =============================================================================
// InteriorOS Backend — Current User Project Permissions API
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { connectDB } from '@/lib/db';
import { ProjectMember } from '@/models/project-member.model';
import { successResponse, serverErrorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';

// GET: Get the current user's membership & permissions for this project
async function getMyPermissionsHandler(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> },
  auth: JwtPayload
) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;

    // Org admins / super admins have full access — return a special flag
    if (auth.systemRole === 'super_admin' || auth.systemRole === 'org_admin') {
      return successResponse({
        isMember: true,
        isAdmin: true,
        projectRole: 'admin',
        permissions: [], // Empty means "all access" when isAdmin is true
      });
    }

    // Look up the user's membership in this project
    const member = await ProjectMember.findOne({
      projectId,
      userId: auth.userId,
      organizationId,
      isDeleted: false,
    });

    if (!member) {
      return successResponse({
        isMember: false,
        isAdmin: false,
        projectRole: null,
        permissions: [],
      });
    }

    return successResponse({
      isMember: true,
      isAdmin: false,
      projectRole: member.projectRole,
      permissions: member.permissions || [],
    });
  } catch (error) {
    console.error('Get my permissions error:', error);
    return serverErrorResponse();
  }
}

export const GET = withAuth(getMyPermissionsHandler);
