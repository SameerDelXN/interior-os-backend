// =============================================================================
// InteriorOS Backend — SuperAdmin API: Templates (List / Create)
// =============================================================================

import { NextRequest } from 'next/server';
import { withSuperAdmin } from '@/middlewares/superadmin.middleware';
import { connectDB } from '@/lib/db';
import { ProjectTemplate } from '@/models/project-template.model';
import {
  successResponse,
  createdResponse,
  validationErrorResponse,
  serverErrorResponse,
} from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';

/**
 * GET /api/v1/superadmin/templates — List all templates
 */
export const GET = withSuperAdmin(
  async (_req: NextRequest, _context: { params: Promise<Record<string, string>> }, _auth: JwtPayload) => {
    try {
      await connectDB();

      const templates = await ProjectTemplate.find({})
        .sort({ name: 1 })
        .lean();

      return successResponse({ templates }, 'Templates retrieved successfully');
    } catch (error) {
      console.error('List templates error:', error);
      return serverErrorResponse();
    }
  }
);

/**
 * POST /api/v1/superadmin/templates — Create a new template
 */
export const POST = withSuperAdmin(
  async (req: NextRequest, _context: { params: Promise<Record<string, string>> }, _auth: JwtPayload) => {
    try {
      const body = await req.json();

      // Basic validation
      if (!body.name || !body.category || !body.description) {
        return validationErrorResponse([
          { field: 'name/category/description', message: 'Name, category, and description are required' },
        ]);
      }

      await connectDB();

      // Check duplicate name
      const existing = await ProjectTemplate.findOne({ name: body.name });
      if (existing) {
        return validationErrorResponse([
          { field: 'name', message: 'A template with this name already exists' },
        ]);
      }

      const template = await ProjectTemplate.create({
        name: body.name,
        category: body.category,
        description: body.description,
        wbs: body.wbs || [],
        milestones: body.milestones || [],
        procurement: body.procurement || [],
      });

      return createdResponse({ template }, 'Template created successfully');
    } catch (error) {
      console.error('Create template error:', error);
      return serverErrorResponse();
    }
  }
);
