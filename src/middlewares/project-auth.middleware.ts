// =============================================================================
// InteriorOS Backend — Project-Level Permission Middleware
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { connectDB } from '@/lib/db';
import { ProjectMember } from '@/models/project-member.model';
import { forbiddenResponse, notFoundResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';
import type { ModuleName, PermissionAction } from '@/models/role.model';

/**
 * Middleware that checks project-level permissions for the current user.
 *
 * Usage:
 *   export const GET = withProjectPermission('tasks', 'read', handler);
 *
 * Flow:
 * 1. Authenticates the user via withAuth.
 * 2. Org admins / super admins bypass the check (full access).
 * 3. Looks up the user's ProjectMember record for the projectId in the route.
 * 4. Checks their `permissions` array for the required module + action.
 * 5. If the user isn't a project member or lacks the permission, returns 403.
 */
export function withProjectPermission(
  module: ModuleName,
  action: PermissionAction,
  handler: (req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) => Promise<Response>
) {
  return withAuth(async (req, context, auth) => {
    // Super admin and org admin have full access everywhere
    if (auth.systemRole === 'super_admin' || auth.systemRole === 'org_admin') {
      return handler(req, context, auth);
    }

    await connectDB();
    const organizationId = getOrganizationId(auth);

    // Extract projectId from route params
    const params = context?.params ? await context.params : ({} as Record<string, string>);
    const projectId = params.projectId;

    if (!projectId) {
      // If no projectId in the route, fall through to the handler
      // (this middleware is only for project-scoped routes)
      return handler(req, context, auth);
    }

    // Look up the user's membership in this project
    const member = await ProjectMember.findOne({
      projectId,
      userId: auth.userId,
      organizationId,
      isDeleted: false,
    });

    if (!member) {
      return forbiddenResponse('You are not a member of this project');
    }

    // Check if the member has the required permission
    const permission = member.permissions?.find(
      (p: { module: string }) => p.module === module
    );

    if (!permission || !permission.actions.includes(action)) {
      return forbiddenResponse(
        `You don't have permission to ${action} ${module.replace('_', ' ')} in this project`
      );
    }

    return handler(req, context, auth);
  });
}

/**
 * Check if a project member has a specific permission.
 * Useful for inline permission checks within handlers.
 */
export async function checkProjectPermission(
  userId: string,
  projectId: string,
  organizationId: string,
  module: ModuleName,
  action: PermissionAction
): Promise<boolean> {
  await connectDB();
  const member = await ProjectMember.findOne({
    projectId,
    userId,
    organizationId,
    isDeleted: false,
  });

  if (!member) return false;

  const permission = member.permissions?.find(
    (p: { module: string }) => p.module === module
  );

  return !!(permission && permission.actions.includes(action));
}
