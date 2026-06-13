// =============================================================================
// InteriorOS Backend — SuperAdmin API: Subscription Plans (List / Create)
// =============================================================================

import { NextRequest } from 'next/server';
import { withSuperAdmin } from '@/middlewares/superadmin.middleware';
import { connectDB } from '@/lib/db';
import { SubscriptionPlan } from '@/models/subscription-plan.model';
import {
  successResponse,
  createdResponse,
  validationErrorResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';

/**
 * GET /api/v1/superadmin/plans — List all subscription plans
 */
export const GET = withSuperAdmin(
  async (_req: NextRequest, _context: { params: Promise<Record<string, string>> }, _auth: JwtPayload) => {
    try {
      await connectDB();

      const plans = await SubscriptionPlan.find({})
        .sort({ sortOrder: 1, createdAt: 1 })
        .lean();

      return successResponse({ plans }, 'Plans retrieved successfully');
    } catch (error) {
      console.error('List plans error:', error);
      return serverErrorResponse();
    }
  }
);

/**
 * POST /api/v1/superadmin/plans — Create a new subscription plan
 */
export const POST = withSuperAdmin(
  async (req: NextRequest, _context: { params: Promise<Record<string, string>> }, _auth: JwtPayload) => {
    try {
      const body = await req.json();

      // Basic validation
      if (!body.name || !body.slug || !body.description) {
        return validationErrorResponse([
          { field: 'name/slug/description', message: 'Name, slug, and description are required' },
        ]);
      }

      await connectDB();

      // Check duplicate slug
      const existing = await SubscriptionPlan.findOne({ slug: body.slug });
      if (existing) {
        return validationErrorResponse([
          { field: 'slug', message: 'A plan with this slug already exists' },
        ]);
      }

      const plan = await SubscriptionPlan.create({
        name: body.name,
        slug: body.slug,
        description: body.description,
        price: {
          monthly: body.price?.monthly ?? 0,
          yearly: body.price?.yearly ?? 0,
        },
        currency: body.currency || 'INR',
        billingCycle: body.billingCycle || 'both',
        features: body.features || [],
        limits: {
          maxProjects: body.limits?.maxProjects ?? 5,
          maxUsers: body.limits?.maxUsers ?? 10,
          maxStorageGB: body.limits?.maxStorageGB ?? 10,
          max3DModels: body.limits?.max3DModels ?? 3,
        },
        trialDays: body.trialDays ?? 14,
        isPopular: body.isPopular ?? false,
        isActive: body.isActive ?? true,
        sortOrder: body.sortOrder ?? 0,
      });

      return createdResponse({ plan }, 'Plan created successfully');
    } catch (error) {
      console.error('Create plan error:', error);
      return serverErrorResponse();
    }
  }
);
