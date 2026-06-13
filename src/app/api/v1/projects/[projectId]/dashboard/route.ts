// =============================================================================
// InteriorOS Backend — Project Dashboard API: Aggregated Metrics
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { connectDB } from '@/lib/db';
import { Project } from '@/models/project.model';
import { Task } from '@/models/task.model';
import { Milestone } from '@/models/milestone.model';
import { calculateProjectMetrics } from '@/services/project-metrics.service';
import { successResponse, notFoundResponse, serverErrorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';

// GET: Aggregate metrics for the project dashboard
async function getProjectDashboardHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;

    // Check if project exists
    const project = await Project.findOne({ _id: projectId, organizationId, isDeleted: false });
    if (!project) {
      return notFoundResponse('Project not found');
    }

    // 1. Task calculations
    const allTasks = await Task.find({ projectId, organizationId, isDeleted: false }).select('status progress');
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.status === 'completed').length;

    const taskBreakdown = {
      backlog: allTasks.filter(t => t.status === 'backlog').length,
      todo: allTasks.filter(t => t.status === 'todo').length,
      in_progress: allTasks.filter(t => t.status === 'in_progress').length,
      in_review: allTasks.filter(t => t.status === 'in_review').length,
      completed: completedTasks,
    };

    // 2. Milestones
    const allMilestones = await Milestone.find({ projectId, organizationId, isDeleted: false }).select('status');
    const milestoneSummary = {
      total: allMilestones.length,
      planned: allMilestones.filter(m => m.status === 'planned').length,
      achieved: allMilestones.filter(m => m.status === 'achieved').length,
      delayed: allMilestones.filter(m => m.status === 'delayed').length,
    };

    // 3. Placeholders for subsequent phases (Snags, RFIs, Risks)
    const qualitySummary = {
      openSnags: 0,
      openRFIs: 0,
      criticalRisks: 0,
    };

    // Calculate dynamic project metrics
    const metrics = await calculateProjectMetrics(projectId, organizationId, project);

    // 4. Return combined details
    return successResponse({
      project: {
        id: project._id,
        name: project.name,
        code: project.code,
        client: project.client,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        budget: project.budget,
        location: project.location,
        description: project.description,
        progress: metrics.progress,
        health: metrics.health,
        healthColor: metrics.healthColor,
        healthLabel: metrics.healthLabel,
        threeDModelUrl: project.threeDModelUrl,
      },
      taskStats: {
        total: totalTasks,
        completed: completedTasks,
        remaining: totalTasks - completedTasks,
        breakdown: taskBreakdown,
      },
      milestones: milestoneSummary,
      quality: qualitySummary,
    });
  } catch (error) {
    console.error('Project dashboard error:', error);
    return serverErrorResponse();
  }
}

export const GET = withAuth(getProjectDashboardHandler);
