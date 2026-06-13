// =============================================================================
// InteriorOS Backend — Projects API: GET, PUT, DELETE by ID
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { withProjectPermission } from '@/middlewares/project-auth.middleware';
import { connectDB } from '@/lib/db';
import { Project } from '@/models/project.model';
import { calculateProjectMetrics } from '@/services/project-metrics.service';
import { successResponse, notFoundResponse, serverErrorResponse, errorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';
import { z } from 'zod';
const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  client: z.string().min(1).max(100).optional(),
  type: z.enum(['Commercial Office', 'Residential', 'Tech Office', 'General']).optional(),
  status: z.enum(['active', 'inactive', 'completed', 'on-hold']).optional(),
  startDate: z.string().transform((val) => new Date(val)).optional(),
  endDate: z.string().transform((val) => new Date(val)).optional(),
  budget: z.object({
    amount: z.number().nonnegative(),
    currency: z.string(),
  }).optional(),
  location: z.object({
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    zipCode: z.string().optional(),
  }).optional(),
  description: z.string().optional(),
  threeDModelUrl: z.string().optional(),
});// GET: Get project details
async function getProjectDetailsHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;

    const project = await Project.findOne({ _id: projectId, organizationId, isDeleted: false });
    if (!project) {
      return notFoundResponse('Project not found');
    }

    const metrics = await calculateProjectMetrics(projectId, organizationId, project);
    const enrichedProject = {
      ...project.toJSON(),
      progress: metrics.progress,
      health: metrics.health,
      healthColor: metrics.healthColor,
      healthLabel: metrics.healthLabel,
    };

    return successResponse(enrichedProject);
  } catch (error) {
    console.error('Get project details error:', error);
    return serverErrorResponse();
  }
}

// PUT: Update project
async function updateProjectHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;
    const body = await req.json();

    const validation = updateProjectSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, 400);
    }

    const project = await Project.findOneAndUpdate(
      { _id: projectId, organizationId, isDeleted: false },
      { $set: validation.data },
      { new: true }
    );

    if (!project) {
      return notFoundResponse('Project not found');
    }

    return successResponse(project, 'Project updated successfully');
  } catch (error) {
    console.error('Update project error:', error);
    return serverErrorResponse();
  }
}

// DELETE: Soft delete project
async function deleteProjectHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;

    const project = await Project.findOneAndUpdate(
      { _id: projectId, organizationId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true }
    );

    if (!project) {
      return notFoundResponse('Project not found');
    }

    return successResponse(null, 'Project deleted successfully');
  } catch (error) {
    console.error('Delete project error:', error);
    return serverErrorResponse();
  }
}

export const GET = withProjectPermission('projects', 'read', getProjectDetailsHandler);
export const PUT = withProjectPermission('projects', 'update', updateProjectHandler);
export const DELETE = withProjectPermission('projects', 'delete', deleteProjectHandler);
