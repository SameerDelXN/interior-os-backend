// =============================================================================
// InteriorOS Backend — Tasks API: List & Create
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { withProjectPermission } from '@/middlewares/project-auth.middleware';
import { connectDB } from '@/lib/db';
import { Task } from '@/models/task.model';
import { Package } from '@/models/wbs.model';
import { successResponse, createdResponse, serverErrorResponse, errorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';
import { z } from 'zod';

const createTaskSchema = z.object({
  packageId: z.string().min(1, 'Package ID is required'),
  name: z.string().min(1, 'Task name is required').max(100),
  description: z.string().optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'completed']).default('backlog'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  startDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  assignees: z.array(z.string()).optional().default([]),
  dependencies: z.array(z.string()).optional().default([]),
});

// GET: List all tasks for project
async function getTasksHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;
    const searchParams = req.nextUrl.searchParams;

    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const packageId = searchParams.get('packageId');
    const assignee = searchParams.get('assignee');
    const search = searchParams.get('search');

    const query: any = { projectId, organizationId, isDeleted: false };

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (packageId) query.packageId = packageId;
    if (assignee) query.assignees = assignee;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const tasks = await Task.find(query)
      .populate('assignees', 'firstName lastName email avatar designation')
      .populate('packageId', 'name trade')
      .sort({ createdAt: -1 });

    return successResponse(tasks);
  } catch (error) {
    console.error('List tasks error:', error);
    return serverErrorResponse();
  }
}

// POST: Create a task in WBS Package
async function createTaskHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;
    const body = await req.json();

    const validation = createTaskSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, 400);
    }

    const data = validation.data;

    // Check if package exists
    const packageExists = await Package.exists({ _id: data.packageId, projectId, organizationId });
    if (!packageExists) {
      return errorResponse('Linked WBS package not found', 404);
    }

    const task = new Task({
      ...data,
      projectId,
      organizationId,
    });

    await task.save();
    return createdResponse(task, 'Task created successfully');
  } catch (error) {
    console.error('Create task error:', error);
    return serverErrorResponse();
  }
}

export const GET = withProjectPermission('tasks', 'read', getTasksHandler);
export const POST = withProjectPermission('tasks', 'create', createTaskHandler);
