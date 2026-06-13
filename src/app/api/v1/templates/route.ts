// =============================================================================
// InteriorOS Backend — Tenant Templates API (List available templates)
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth } from '@/middlewares/auth.middleware';
import { connectDB } from '@/lib/db';
import { ProjectTemplate } from '@/models/project-template.model';
import { successResponse, serverErrorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';

/**
 * GET /api/v1/templates — List all active templates for project creation select option
 */
async function getTemplatesHandler(req: NextRequest, _context: any, _auth: JwtPayload) {
  try {
    await connectDB();

    const templates = await ProjectTemplate.find({ isDeleted: false })
      .select('name category description wbs milestones procurement')
      .sort({ category: 1, name: 1 })
      .lean();

    return successResponse({ templates }, 'Templates retrieved successfully');
  } catch (error) {
    console.error('List client templates error:', error);
    return serverErrorResponse();
  }
}

export const GET = withAuth(getTemplatesHandler);
