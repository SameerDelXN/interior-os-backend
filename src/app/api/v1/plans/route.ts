// =============================================================================
// InteriorOS Backend — Plans API for Users
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth } from '@/middlewares/auth.middleware';
import { connectDB } from '@/lib/db';
import { SubscriptionPlan } from '@/models/subscription-plan.model';
import { successResponse, serverErrorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';

/**
 * GET /api/v1/plans — List all active subscription plans
 */
async function getPlansHandler(_req: NextRequest, _context: any, _auth: JwtPayload) {
  try {
    await connectDB();

    const plans = await SubscriptionPlan.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    return successResponse({ plans }, 'Plans retrieved successfully');
  } catch (error) {
    console.error('List user plans error:', error);
    return serverErrorResponse();
  }
}

export const GET = withAuth(getPlansHandler);
