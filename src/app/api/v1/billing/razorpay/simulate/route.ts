// =============================================================================
// InteriorOS Backend — Simulation Bypass Route
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { connectDB } from '@/lib/db';
import { Organization } from '@/models/organization.model';
import { SubscriptionPlan } from '@/models/subscription-plan.model';
import { successResponse, errorResponse, validationErrorResponse, serverErrorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';

async function simulateUpgradeHandler(req: NextRequest, _context: any, auth: JwtPayload) {
  try {
    const body = await req.json();
    const { planId, billingCycle } = body;

    if (!planId || !billingCycle) {
      return validationErrorResponse([
        { field: 'planId/billingCycle', message: 'planId and billingCycle are required' },
      ]);
    }

    await connectDB();
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return errorResponse('Subscription plan not found', 404);
    }

    const orgId = getOrganizationId(auth);
    const org = await Organization.findById(orgId);
    if (!org) {
      return errorResponse('Organization not found', 404);
    }

    const days = billingCycle === 'monthly' ? 30 : 365;
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + days);

    org.subscription = {
      plan: plan.slug as any,
      planId: plan._id,
      status: 'active',
      currentPeriodEnd,
      trialEndsAt: org.subscription?.trialEndsAt
    };

    await org.save();

    return successResponse({
      subscription: org.subscription,
      organizationName: org.name,
      planName: plan.name,
    }, 'Subscription simulated and activated successfully');

  } catch (error) {
    console.error('Simulate upgrade error:', error);
    return serverErrorResponse();
  }
}

export const POST = withAuth(simulateUpgradeHandler);
