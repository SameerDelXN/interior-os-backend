// =============================================================================
// InteriorOS Backend — Auth Middleware
// =============================================================================

import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { verifyAccessToken, JwtPayload } from '@/lib/jwt';
import { unauthorizedResponse, forbiddenResponse, notFoundResponse } from '@/lib/api-response';
import { connectDB } from '@/lib/db';
import { User } from '@/models/user.model';
import { Organization } from '@/models/organization.model';
import type { ModuleName, PermissionAction } from '@/models/role.model';

// Extend the request with auth context
export interface AuthenticatedRequest extends NextRequest {
  auth?: JwtPayload & {
    user?: InstanceType<typeof User>;
  };
}

/**
 * Extract and verify JWT from request
 */
export async function authenticateRequest(req: NextRequest): Promise<JwtPayload | null> {
  const authHeader = req.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7).trim();
  console.log("Extracted token for verification:", JSON.stringify(token));

  try {
    const payload = verifyAccessToken(token);
    return payload;
  } catch (err: any) {
    console.error('verifyAccessToken error:', err.message || err);
    return null;
  }
}

/**
 * Middleware wrapper that ensures authentication
 */
export function withAuth(
  handler: (req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) => Promise<Response>
) {
  return async (req: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    const auth = await authenticateRequest(req);

    if (!auth) {
      return unauthorizedResponse('Invalid or expired token');
    }

    // Verify user still exists and is active
    await connectDB();
    const user = await User.findById(auth.userId).select('status isDeleted');

    if (!user || user.isDeleted || user.status !== 'active') {
      return unauthorizedResponse('Account is inactive or not found');
    }

    // Subscription check
    const path = req.nextUrl.pathname;
    const isSuperAdmin = auth.systemRole === 'super_admin';
    const isBypassRoute =
      isSuperAdmin ||
      path.startsWith('/api/v1/superadmin') ||
      path.startsWith('/api/v1/auth/me') ||
      path.startsWith('/api/v1/auth/refresh') ||
      path.startsWith('/api/v1/plans') ||
      path.startsWith('/api/v1/billing');

    if (!isBypassRoute) {
      const org = await Organization.findById(auth.organizationId).select('subscription');
      if (org) {
        const sub = org.subscription;
        let isExpired = false;

        if (sub) {
          if (sub.status === 'expired' || sub.status === 'inactive') {
            isExpired = true;
          } else if (sub.status === 'trial') {
            if (sub.trialEndsAt && new Date() > new Date(sub.trialEndsAt)) {
              isExpired = true;
            }
          } else if (sub.status === 'active') {
            if (sub.currentPeriodEnd && new Date() > new Date(sub.currentPeriodEnd)) {
              isExpired = true;
            }
          }
        } else {
          isExpired = true;
        }

        if (isExpired) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'SUBSCRIPTION_EXPIRED',
              message: 'Your subscription has expired. Please upgrade or renew your plan to continue.',
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }
    }

    // Parameter validation: If projectId exists in route params, verify it's a valid ObjectId
    const params = context?.params ? await context.params.catch(() => ({} as Record<string, string>)) : {};
    const projectId = (params as Record<string, string>)?.projectId;
    if (projectId && !mongoose.Types.ObjectId.isValid(projectId)) {
      return notFoundResponse('Project not found');
    }

    return handler(req, context, auth);
  };
}

/**
 * Middleware wrapper for RBAC permission checks
 */
export function withPermission(
  module: ModuleName,
  action: PermissionAction,
  handler: (req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) => Promise<Response>
) {
  return withAuth(async (req, context, auth) => {
    // Super admin and org admin have all permissions
    if (auth.systemRole === 'super_admin' || auth.systemRole === 'org_admin') {
      return handler(req, context, auth);
    }

    // Check role-based permissions
    await connectDB();
    const user = await User.findById(auth.userId).populate('role');

    if (!user?.role) {
      return forbiddenResponse('No role assigned');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const role = user.role as any;
    const permission = role.permissions?.find((p: { module: string }) => p.module === module);

    if (!permission || !permission.actions.includes(action)) {
      return forbiddenResponse(`You don't have permission to ${action} ${module}`);
    }

    return handler(req, context, auth);
  });
}

/**
 * Extract organization ID from authenticated request — ensures tenant isolation
 */
export function getOrganizationId(auth: JwtPayload): string {
  return auth.organizationId;
}
