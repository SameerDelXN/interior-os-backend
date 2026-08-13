// =============================================================================
// InteriorOS Backend — Project Metrics Service
// =============================================================================

import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { Project } from '@/models/project.model';
import { Task } from '@/models/task.model';
import { Milestone } from '@/models/milestone.model';
import { Risk } from '@/models/risk.model';

export interface ProjectMetrics {
  progress: number;
  health: 'on-track' | 'at-risk' | 'delayed';
  healthColor: 'green' | 'yellow' | 'red';
  healthLabel: string;
}

/**
 * Calculates dynamic project progress and health using multi-aspect parameters:
 * - Deadline / Schedule Duration Progress (20% weight)
 * - Tasks Completion progress (50% weight)
 * - Milestones Achievement progress (30% weight)
 * 
 * Also evaluates project health based on overdue tasks, critical risks, and delayed milestones.
 */
export async function calculateProjectMetrics(
  projectId: string | mongoose.Types.ObjectId,
  organizationId: string | mongoose.Types.ObjectId,
  projectDoc?: any
): Promise<ProjectMetrics> {
  try {
    await connectDB();
    const now = new Date();

    // 1. Get Project Doc if not provided
    const project = projectDoc || await Project.findOne({ _id: projectId, organizationId, isDeleted: false });
    if (!project) {
      return {
        progress: 0,
        health: 'on-track',
        healthColor: 'green',
        healthLabel: 'On Track',
      };
    }

    // If completed, override with 100% and green health
    if (project.status === 'completed') {
      return {
        progress: 100,
        health: 'on-track',
        healthColor: 'green',
        healthLabel: 'Completed',
      };
    }

    // 2. Timeline Progress Calculation (20% weight)
    let timelineProgress = 0;
    if (project.startDate && project.endDate) {
      const start = new Date(project.startDate).getTime();
      const end = new Date(project.endDate).getTime();
      const totalDuration = end - start;

      if (totalDuration > 0) {
        const elapsed = now.getTime() - start;
        if (elapsed < 0) {
          timelineProgress = 0;
        } else if (elapsed > totalDuration) {
          timelineProgress = 100;
        } else {
          timelineProgress = (elapsed / totalDuration) * 100;
        }
      } else {
        timelineProgress = 100;
      }
    }

    // 3. Tasks Progress Calculation (50% weight)
    const tasks = await Task.find({ projectId: project._id, isDeleted: false }).select('status progress endDate').lean();
    const totalTasks = tasks.length;

    let tasksProgress = 0;
    const hasTasks = totalTasks > 0;
    if (hasTasks) {
      const sumProgress = tasks.reduce((sum, t) => sum + (t.progress || 0), 0);
      tasksProgress = sumProgress / totalTasks;
    }

    // 4. Milestones Progress Calculation (30% weight)
    const milestones = await Milestone.find({ projectId: project._id, isDeleted: false }).select('status dueDate').lean();
    const totalMilestones = milestones.length;

    let milestonesProgress = 0;
    const hasMilestones = totalMilestones > 0;
    if (hasMilestones) {
      const achievedMilestones = milestones.filter((m) => m.status === 'achieved').length;
      milestonesProgress = (achievedMilestones / totalMilestones) * 100;
    }

    // 5. Blended Progress Calculation
    let overallProgress = 0;
    if (hasTasks && hasMilestones) {
      overallProgress = Math.round(
        tasksProgress * 0.5 +
        milestonesProgress * 0.3 +
        timelineProgress * 0.2
      );
    } else if (hasTasks) {
      overallProgress = Math.round(
        tasksProgress * 0.7 +
        timelineProgress * 0.3
      );
    } else if (hasMilestones) {
      overallProgress = Math.round(
        milestonesProgress * 0.7 +
        timelineProgress * 0.3
      );
    } else {
      overallProgress = Math.round(timelineProgress);
    }

    // Clamp overall progress to [0, 100]
    overallProgress = Math.max(0, Math.min(100, overallProgress));

    // 6. Health Status Evaluation
    let health: 'on-track' | 'at-risk' | 'delayed' = 'on-track';
    let healthColor: 'green' | 'yellow' | 'red' = 'green';
    let healthLabel = 'On Track';

    // Condition 1: Delayed
    // If any milestone status is 'delayed', or project's endDate is in the past and overall progress is under 100%
    const hasDelayedMilestone = milestones.some((m) => m.status === 'delayed');
    const isPastEndDate = project.endDate && new Date(project.endDate) < now;

    // Condition 2: At Risk
    // If there is any overdue task (not completed and past task endDate), or if there are open risks with score >= 6
    const hasOverdueTask = tasks.some((t) => {
      return t.status !== 'completed' && t.endDate && new Date(t.endDate) < now;
    });

    const openCriticalRisksCount = await Risk.countDocuments({
      projectId: project._id,
      status: 'open',
      score: { $gte: 6 },
      isDeleted: false,
    });
    const hasCriticalRisk = openCriticalRisksCount > 0;

    if (hasDelayedMilestone || (isPastEndDate && overallProgress < 100)) {
      health = 'delayed';
      healthColor = 'red';
      healthLabel = 'Delayed';
    } else if (hasOverdueTask || hasCriticalRisk) {
      health = 'at-risk';
      healthColor = 'yellow';
      healthLabel = 'At Risk';
    }

    return {
      progress: overallProgress,
      health,
      healthColor,
      healthLabel,
    };
  } catch (error) {
    console.error('Error calculating project metrics:', error);
    return {
      progress: 0,
      health: 'on-track',
      healthColor: 'green',
      healthLabel: 'On Track',
    };
  }
}
