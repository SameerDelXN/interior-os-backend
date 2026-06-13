// =============================================================================
// InteriorOS Backend — SuperAdmin Middleware
// =============================================================================

import { NextRequest } from 'next/server';
import type { JwtPayload } from '@/lib/jwt';

/**
 * Middleware wrapper that bypasses auth for SuperAdmin dashboard.
 * Provides a mock JwtPayload to down-stream route handlers.
 */
export function withSuperAdmin(
  handler: (req: NextRequest, context: { params: any }, auth: JwtPayload) => Promise<Response>
) {
  return async (req: NextRequest, context: { params: any }) => {
    const mockAuth: JwtPayload = {
      userId: '6a1fd65456ca93eacccac5f8', // Sameer's ID
      organizationId: '6a1fd65456ca93eacccac5f3',
      systemRole: 'super_admin',
      email: 'superadmin@interioros.com',
    };

    return handler(req, context, mockAuth);
  };
}
