import { NextRequest } from 'next/server';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { connectDB } from '@/lib/db';
import { Project } from '@/models/project.model';
import { ProjectMember } from '@/models/project-member.model';
import { Task } from '@/models/task.model';
import { Milestone } from '@/models/milestone.model';
import { Snag } from '@/models/snag.model';
import { RFI } from '@/models/rfi.model';
import { Risk } from '@/models/risk.model';
import { PurchaseOrder } from '@/models/purchase-order.model';
import { CrmCustomer } from '@/models/crm-customer.model';
import { calculateProjectMetrics } from '@/services/project-metrics.service';
import { successResponse, serverErrorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';

async function getGlobalDashboardHandler(req: NextRequest, _context: any, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);

    let projectFilter: any = { organizationId, isDeleted: false };
    
    // If the user is a regular member, restrict to projects they belong to
    if (auth.systemRole !== 'super_admin' && auth.systemRole !== 'org_admin') {
      const userMemberships = await ProjectMember.find({
        userId: auth.userId,
        organizationId,
        isDeleted: false,
      }).select('projectId');
      const projectIds = userMemberships.map((m) => m.projectId);
      projectFilter._id = { $in: projectIds };
    }

    // 1. CRM Lead Metrics — single aggregation instead of 6 separate counts
    const crmFilter = { organizationId };
    const [leadAgg] = await CrmCustomer.aggregate([
      { $match: crmFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          new: { $sum: { $cond: [{ $eq: ['$status', 'New Lead'] }, 1, 0] } },
          won: { $sum: { $cond: [{ $eq: ['$status', 'Won'] }, 1, 0] } },
          contacted: { $sum: { $cond: [{ $eq: ['$status', 'Contacted'] }, 1, 0] } },
          meetingOrMeasured: { $sum: { $cond: [{ $in: ['$status', ['Meeting Scheduled', 'Measurement Done']] }, 1, 0] } },
          reqCompleted: { $sum: { $cond: [{ $eq: ['$status', 'Requirement Completed'] }, 1, 0] } },
          quotSent: { $sum: { $cond: [{ $eq: ['$status', 'Quotation Sent'] }, 1, 0] } },
          lost: { $sum: { $cond: [{ $eq: ['$status', 'Lost'] }, 1, 0] } },
        },
      },
    ]);
    const lm = leadAgg || { total: 0, new: 0, won: 0, contacted: 0, meetingOrMeasured: 0, reqCompleted: 0, quotSent: 0, lost: 0 };
    const totalLeads = lm.total;
    const newLeads = lm.new;
    const wonLeads = lm.won;
    const activeLeads = lm.total - lm.won - lm.lost;

    const leadsPipeline = [
      { stage: 'New Leads', count: lm.new },
      { stage: 'Follow-ups', count: lm.contacted },
      { stage: 'Site Visits', count: lm.meetingOrMeasured },
      { stage: 'Requirements', count: lm.reqCompleted },
      { stage: 'Quotations', count: lm.quotSent },
      { stage: 'Won Projects', count: lm.won },
    ];

    // 2. Projects and Basic Metrics
    const allProjects = await Project.find(projectFilter).lean();
    const totalProjectsCount = allProjects.length;
    const activeProjects = allProjects.filter(p => p.status === 'active');
    const activeProjectsCount = activeProjects.length;

    // Build query for other tables that limits them to user's projects
    const scopeQuery: any = { organizationId, isDeleted: false };
    if (projectFilter._id) {
      scopeQuery.projectId = projectFilter._id;
    }

    // 2b. Count metrics in parallel instead of sequential
    const [openSnags, openRFIs, criticalRisks, procurementPending, procurementAgg] = await Promise.all([
      Snag.countDocuments({ ...scopeQuery, status: { $in: ['open', 'assigned', 'in_progress'] } }),
      RFI.countDocuments({ ...scopeQuery, status: 'open' }),
      Risk.countDocuments({ ...scopeQuery, status: 'open', score: { $gte: 6 } }),
      PurchaseOrder.countDocuments({ ...scopeQuery, status: 'pending' }),
      PurchaseOrder.aggregate([
        { $match: { organizationId: scopeQuery.organizationId, isDeleted: false, ...(scopeQuery.projectId ? { projectId: scopeQuery.projectId } : {}) } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    // 3. Project Health Evaluation
    let onTrackCount = 0;
    let atRiskCount = 0;
    let delayedCount = 0;

    const topProjects = [];

    for (const project of allProjects) {
      const metrics = await calculateProjectMetrics(project._id, organizationId, project);

      // Increment health counters (completed projects don't count towards active portfolio health stats)
      if (project.status !== 'completed') {
        if (metrics.healthColor === 'red') {
          delayedCount++;
        } else if (metrics.healthColor === 'yellow') {
          atRiskCount++;
        } else {
          onTrackCount++;
        }
      }

      if (project.status === 'active') {
        topProjects.push({
          id: project._id,
          name: project.name,
          progress: metrics.progress,
          status: metrics.healthLabel,
          health: metrics.healthColor, // green, yellow, red
        });
      }
    }

    // Sort top projects by progress descending and limit to 5
    topProjects.sort((a, b) => b.progress - a.progress);
    const limitedTopProjects = topProjects.slice(0, 5);
    // 4. Procurement Stats — already fetched via aggregation above
    const poStatuses = ['pending', 'approved', 'ordered', 'delivered', 'rejected'] as const;
    const poCountMap = new Map(procurementAgg.map((r: { _id: string; count: number }) => [r._id, r.count]));
    const procurementData = poStatuses.map((status) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count: poCountMap.get(status) || 0,
    }));

    // 5. Progress Trend (Last 6 Months) — single batch query instead of N*6
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();

    const activeProjectIds = activeProjects.map(p => p._id);
    const allActiveTasks = activeProjectIds.length > 0
      ? await Task.find({ projectId: { $in: activeProjectIds }, isDeleted: false }).select('projectId progress').lean()
      : [];

    const progressTrendData = [];
    if (allActiveTasks.length > 0) {
      const projectTaskMap = new Map<string, number[]>();
      for (const t of allActiveTasks) {
        const pid = String(t.projectId);
        if (!projectTaskMap.has(pid)) projectTaskMap.set(pid, []);
        projectTaskMap.get(pid)!.push(t.progress || 0);
      }

      let avgActual = 0;
      let count = 0;
      for (const progresses of projectTaskMap.values()) {
        const avg = progresses.reduce((s, p) => s + p, 0) / progresses.length;
        avgActual += avg;
        count++;
      }
      avgActual = count > 0 ? Math.round(avgActual / count) : 0;
      const avgPlanned = Math.min(100, avgActual + 8);

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const scale = (6 - i) / 6;
        progressTrendData.push({
          month: months[d.getMonth()],
          planned: Math.round(avgPlanned * scale),
          actual: Math.round(avgActual * scale),
        });
      }
    } else {
      const curves = [
        { planned: 12, actual: 10 },
        { planned: 24, actual: 20 },
        { planned: 38, actual: 32 },
        { planned: 52, actual: 45 },
        { planned: 68, actual: 60 },
        { planned: 80, actual: 75 },
      ];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const curve = curves[5 - i];
        progressTrendData.push({
          month: months[d.getMonth()],
          planned: curve.planned,
          actual: curve.actual,
        });
      }
    }

    // 6. Recent Activity Feed — parallel queries
    const recentActivities: any[] = [];

    const [recentTasks, recentSnags, recentRFIs, recentLeads] = await Promise.all([
      Task.find(scopeQuery).sort({ updatedAt: -1 }).limit(3).populate('projectId', 'name').lean(),
      Snag.find(scopeQuery).sort({ createdAt: -1 }).limit(2).populate('projectId', 'name').lean(),
      RFI.find(scopeQuery).sort({ createdAt: -1 }).limit(2).populate('projectId', 'name').lean(),
      CrmCustomer.find(crmFilter).sort({ updatedAt: -1 }).limit(3).lean(),
    ]);

    recentTasks.forEach(task => {
      const projName = (task.projectId as any)?.name || 'Project';
      let action = `Task "${task.name}" updated`;
      let type = 'info';
      if (task.status === 'completed') {
        action = `Task "${task.name}" completed`;
        type = 'success';
      }
      recentActivities.push({
        action,
        project: projName,
        time: formatRelativeTime(task.updatedAt),
        timestamp: task.updatedAt.getTime(),
        type,
      });
    });

    // Latest 2 Snags
    recentSnags.forEach(snag => {
      const projName = (snag.projectId as any)?.name || 'Project';
      let action = `Snag raised: "${snag.description}"`;
      let type = 'error';
      if (snag.status === 'closed') {
        action = `Snag closed: "${snag.description}"`;
        type = 'success';
      }
      recentActivities.push({
        action,
        project: projName,
        time: formatRelativeTime(snag.createdAt),
        timestamp: snag.createdAt.getTime(),
        type,
      });
    });

    // Latest 2 RFIs
    recentRFIs.forEach(rfi => {
      const projName = (rfi.projectId as any)?.name || 'Project';
      recentActivities.push({
        action: `RFI #${rfi.rfiNumber} raised: "${rfi.subject}"`,
        project: projName,
        time: formatRelativeTime(rfi.createdAt),
        timestamp: rfi.createdAt.getTime(),
        type: 'warning',
      });
    });

    // Latest CRM Leads
    recentLeads.forEach(lead => {
      let action = `Lead "${lead.name}" (${lead.leadNumber || 'LD'}) is in ${lead.status}`;
      let type = 'info';
      if (lead.status === 'Won') {
        action = `Lead "${lead.name}" converted (Won)`;
        type = 'success';
      } else if (lead.status === 'Quotation Sent') {
        action = `Quotation sent to "${lead.name}"`;
        type = 'warning';
      } else if (lead.status === 'Measurement Done') {
        action = `Site measurements completed for "${lead.name}"`;
        type = 'info';
      }
      const t = lead.updatedAt || lead.createdAt || new Date();
      recentActivities.push({
        action,
        project: lead.projectLocation || 'CRM Pipeline',
        time: formatRelativeTime(t),
        timestamp: t.getTime(),
        type,
      });
    });

    // Sort recent activities by timestamp descending
    recentActivities.sort((a, b) => b.timestamp - a.timestamp);
    const finalActivities = recentActivities.slice(0, 6);

    // If still empty (e.g. no database entries), load some default template entries
    if (finalActivities.length === 0) {
      finalActivities.push(
        { action: "Portfolio initiated", project: "System Board", time: "Just now", type: "info" },
        { action: "Dashboard workspace ready", project: "System Board", time: "1 min ago", type: "success" }
      );
    }

    return successResponse({
      kpis: {
        activeProjects: activeProjectsCount,
        delayedProjects: delayedCount,
        totalLeads,
        newLeads,
        activeLeads,
        wonLeads,
        openSnags,
        openRFIs,
        criticalRisks,
        procurementPending,
      },
      leadsPipeline,
      progressTrend: progressTrendData,
      projectHealth: [
        { name: 'On Track', value: onTrackCount, color: 'hsl(142.1, 76.2%, 36.3%)' },
        { name: 'At Risk', value: atRiskCount, color: 'hsl(38, 92%, 50%)' },
        { name: 'Delayed', value: delayedCount, color: 'hsl(0, 84.2%, 60.2%)' },
      ],
      procurementData,
      topProjects: limitedTopProjects,
      recentActivities: finalActivities,
    });
  } catch (error) {
    console.error('Global dashboard metrics API error:', error);
    return serverErrorResponse();
  }
}

function formatRelativeTime(date: Date): string {
  const diffMs = new Date().getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} mins ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export const GET = withAuth(getGlobalDashboardHandler);
