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

const subtaskInputSchema = z.object({
  title: z.string().min(1, 'Subtask title is required'),
  completed: z.boolean().default(false),
  dueDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  assignedTo: z.string().optional(),
});

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
  subtasks: z.array(subtaskInputSchema).optional().default([]),
  progress: z.number().min(0).max(100).optional(),
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
      .populate('dependencies', 'name status progress')
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

    // Validate dependencies belong to the same project
    if (data.dependencies && data.dependencies.length > 0) {
      const validCount = await Task.countDocuments({
        _id: { $in: data.dependencies },
        projectId,
        organizationId,
        isDeleted: false,
      });
      if (validCount !== data.dependencies.length) {
        return errorResponse('One or more dependency tasks do not exist in this project', 400);
      }
    }

    // Calculate progress from subtasks if subtasks are supplied
    let computedProgress = data.progress ?? 0;
    if (data.subtasks && data.subtasks.length > 0) {
      const completedCount = data.subtasks.filter(s => s.completed).length;
      computedProgress = Math.round((completedCount / data.subtasks.length) * 100);
    }

    let initialStatus = data.status;
    if (computedProgress === 100 && initialStatus !== 'completed') {
      initialStatus = 'completed';
    } else if (initialStatus === 'completed' && computedProgress === 0 && (!data.subtasks || data.subtasks.length === 0)) {
      computedProgress = 100;
    }

    const task = new Task({
      ...data,
      status: initialStatus,
      progress: computedProgress,
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
