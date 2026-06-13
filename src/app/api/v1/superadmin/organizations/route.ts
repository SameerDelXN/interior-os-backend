// =============================================================================
// InteriorOS Backend — SuperAdmin API: Organizations (List)
// =============================================================================

import { NextRequest } from 'next/server';
import { withSuperAdmin } from '@/middlewares/superadmin.middleware';
import { connectDB } from '@/lib/db';
import { Organization } from '@/models/organization.model';
import { User } from '@/models/user.model';
import { Project } from '@/models/project.model';
import {
  successResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';

/**
 * GET /api/v1/superadmin/organizations — List all organizations with stats
 */
export const GET = withSuperAdmin(
  async (req: NextRequest, _context: { params: Promise<Record<string, string>> }, _auth: JwtPayload) => {
    try {
      const { searchParams } = new URL(req.url);
      const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
      const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
      const search = searchParams.get('search') || '';
      const planFilter = searchParams.get('plan') || '';
      const statusFilter = searchParams.get('status') || '';

      await connectDB();

      // Build query
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query: any = { isDeleted: false };

      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { slug: { $regex: search, $options: 'i' } },
        ];
      }

      if (planFilter) {
        query['subscription.plan'] = planFilter;
      }

      if (statusFilter) {
        query['subscription.status'] = statusFilter;
      }

      const [organizations, total] = await Promise.all([
        Organization.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        Organization.countDocuments(query),
      ]);

      // Get user counts and project counts per organization
      const orgIds = organizations.map((o) => o._id);

      const [userCounts, projectCounts] = await Promise.all([
        User.aggregate([
          { $match: { organizationId: { $in: orgIds }, isDeleted: false } },
          { $group: { _id: '$organizationId', count: { $sum: 1 } } },
        ]),
        Project.aggregate([
          { $match: { organizationId: { $in: orgIds }, isDeleted: false } },
          { $group: { _id: '$organizationId', count: { $sum: 1 } } },
        ]),
      ]);

      const userCountMap = new Map(userCounts.map((u) => [u._id.toString(), u.count]));
      const projectCountMap = new Map(projectCounts.map((p) => [p._id.toString(), p.count]));

      const enrichedOrgs = organizations.map((org) => ({
        ...org,
        userCount: userCountMap.get(org._id.toString()) || 0,
        projectCount: projectCountMap.get(org._id.toString()) || 0,
      }));

      return successResponse(
        {
          organizations: enrichedOrgs,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
        'Organizations retrieved successfully'
      );
    } catch (error) {
      console.error('List organizations error:', error);
      return serverErrorResponse();
    }
  }
);
