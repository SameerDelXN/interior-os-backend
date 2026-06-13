// =============================================================================
// InteriorOS Backend — Tasks API: GET, PUT, DELETE by ID
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { withProjectPermission } from '@/middlewares/project-auth.middleware';
import { connectDB } from '@/lib/db';
import { Task } from '@/models/task.model';
import { successResponse, notFoundResponse, serverErrorResponse, errorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';
import { z } from 'zod';

const updateTaskSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  status: z.enum(['backlog', 'todo', 'in_progress', 'in_review', 'completed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  startDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  assignees: z.array(z.string()).optional(),
  progress: z.number().min(0).max(100).optional(),
  dependencies: z.array(z.string()).optional(),
});

// GET: Get task details
async function getTaskDetailsHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId, taskId } = await context.params;

    const task = await Task.findOne({ _id: taskId, projectId, organizationId, isDeleted: false })
      .populate('assignees', 'firstName lastName email avatar designation')
      .populate('packageId', 'name trade');

    if (!task) {
      return notFoundResponse('Task not found');
    }

    return successResponse(task);
  } catch (error) {
    console.error('Get task details error:', error);
    return serverErrorResponse();
  }
}

// PUT: Update task details
async function updateTaskHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId, taskId } = await context.params;
    const body = await req.json();

    const validation = updateTaskSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, 400);
    }

    const updateData = { ...validation.data };

    // Automatically set progress to 100 if status is completed
    if (updateData.status === 'completed' && updateData.progress === undefined) {
      updateData.progress = 100;
    }

    const task = await Task.findOneAndUpdate(
      { _id: taskId, projectId, organizationId, isDeleted: false },
      { $set: updateData },
      { new: true }
    ).populate('assignees', 'firstName lastName email avatar designation')
     .populate('packageId', 'name trade');

    if (!task) {
      return notFoundResponse('Task not found');
    }

    return successResponse(task, 'Task updated successfully');
  } catch (error) {
    console.error('Update task error:', error);
    return serverErrorResponse();
  }
}

// DELETE: Soft delete task
async function deleteTaskHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId, taskId } = await context.params;

    const task = await Task.findOneAndUpdate(
      { _id: taskId, projectId, organizationId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } },
      { new: true }
    );

    if (!task) {
      return notFoundResponse('Task not found');
    }

    return successResponse(null, 'Task deleted successfully');
  } catch (error) {
    console.error('Delete task error:', error);
    return serverErrorResponse();
  }
}

export const GET = withProjectPermission('tasks', 'read', getTaskDetailsHandler);
export const PUT = withProjectPermission('tasks', 'update', updateTaskHandler);
export const DELETE = withProjectPermission('tasks', 'delete', deleteTaskHandler);
