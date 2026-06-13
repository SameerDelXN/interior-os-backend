// =============================================================================
// InteriorOS Backend — SuperAdmin API: Analytics
// =============================================================================

import { NextRequest } from 'next/server';
import { withSuperAdmin } from '@/middlewares/superadmin.middleware';
import { connectDB } from '@/lib/db';
import { Organization } from '@/models/organization.model';
import { User } from '@/models/user.model';
import { Project } from '@/models/project.model';
import { SubscriptionPlan } from '@/models/subscription-plan.model';
import {
  successResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';

/**
 * GET /api/v1/superadmin/analytics — Aggregate platform analytics
 */
export const GET = withSuperAdmin(
  async (_req: NextRequest, _context: { params: Promise<Record<string, string>> }, _auth: JwtPayload) => {
    try {
      await connectDB();

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [
        totalOrgs,
        activeOrgs,
        totalUsers,
        activeUsers,
        totalProjects,
        totalPlans,
        planDistribution,
        statusDistribution,
        signupTrend,
        recentOrgs,
      ] = await Promise.all([
        // Total counts
        Organization.countDocuments({ isDeleted: false }),
        Organization.countDocuments({ isDeleted: false, isActive: true }),
        User.countDocuments({ isDeleted: false }),
        User.countDocuments({ isDeleted: false, status: 'active' }),
        Project.countDocuments({ isDeleted: false }),
        SubscriptionPlan.countDocuments({ isActive: true }),

        // Plan distribution
        Organization.aggregate([
          { $match: { isDeleted: false } },
          { $group: { _id: '$subscription.plan', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),

        // Subscription status distribution
        Organization.aggregate([
          { $match: { isDeleted: false } },
          { $group: { _id: '$subscription.status', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),

        // Signup trend (last 30 days, grouped by day)
        Organization.aggregate([
          {
            $match: {
              isDeleted: false,
              createdAt: { $gte: thirtyDaysAgo },
            },
          },
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),

        // Recent organizations
        Organization.find({ isDeleted: false })
          .sort({ createdAt: -1 })
          .limit(5)
          .select('name slug subscription.plan subscription.status createdAt isActive')
          .lean(),
      ]);

      // Calculate estimated revenue based on plan distribution
      const plans = await SubscriptionPlan.find({ isActive: true }).lean();
      const planPriceMap = new Map(plans.map((p) => [p.slug, p.price.monthly]));

      let estimatedMRR = 0;
      for (const dist of planDistribution) {
        const planPrice = planPriceMap.get(dist._id) || 0;
        estimatedMRR += planPrice * dist.count;
      }

      return successResponse(
        {
          overview: {
            totalOrgs,
            activeOrgs,
            totalUsers,
            activeUsers,
            totalProjects,
            totalPlans,
            estimatedMRR,
          },
          planDistribution: planDistribution.map((d) => ({
            plan: d._id || 'unassigned',
            count: d.count,
          })),
          statusDistribution: statusDistribution.map((d) => ({
            status: d._id || 'unknown',
            count: d.count,
          })),
          signupTrend: signupTrend.map((d) => ({
            date: d._id,
            signups: d.count,
          })),
          recentOrgs,
        },
        'Analytics retrieved successfully'
      );
    } catch (error) {
      console.error('Analytics error:', error);
      return serverErrorResponse();
    }
  }
);
