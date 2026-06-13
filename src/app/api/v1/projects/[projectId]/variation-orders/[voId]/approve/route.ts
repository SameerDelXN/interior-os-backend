// =============================================================================
// InteriorOS Backend — Variation Order Approval & Auto-Impact API
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { connectDB } from '@/lib/db';
import { VariationOrder, Project, BOQ, BOQItem, Package, Task, PurchaseOrder, User } from '@/models';
import { successResponse, notFoundResponse, serverErrorResponse, errorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';
import mongoose from 'mongoose';

// POST: Approve Variation Order and execute database side-effects
async function approveVoHandler(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> },
  auth: JwtPayload
) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId, voId } = await context.params;

    const variationOrder = await VariationOrder.findOne({
      _id: voId,
      projectId,
      organizationId,
      isDeleted: false,
    });

    if (!variationOrder) {
      return notFoundResponse('Variation order not found');
    }

    if (variationOrder.status === 'approved' || variationOrder.status === 'executed') {
      return errorResponse('Variation order is already approved/executed', 400);
    }

    // 1. UPDATE PROJECT BUDGET
    const project = await Project.findOne({ _id: projectId, organizationId, isDeleted: false });
    if (!project) {
      return notFoundResponse('Project not found');
    }

    const netDifference = variationOrder.financialSummary.netDifference || 0;
    
    // Add net difference to project budget
    if (!project.budget) {
      project.budget = { amount: 0, currency: 'INR' };
    }
    project.budget.amount += netDifference;
    await project.save();

    // 2. UPDATE BOQ
    // Find the active approved BOQ for the project
    const activeBoq = await BOQ.findOne({
      projectId,
      organizationId,
      status: 'approved',
      isDeleted: false,
    });

    if (activeBoq) {
      // Find highest serial number
      const latestItem = await BOQItem.findOne({ boqId: activeBoq._id }).sort({ serialNumber: -1 });
      const nextSerial = latestItem ? latestItem.serialNumber + 1 : 1;

      // Create new line item for the variation
      const boqItem = new BOQItem({
        organizationId,
        projectId,
        boqId: activeBoq._id,
        serialNumber: nextSerial,
        category: variationOrder.category,
        itemName: `VO Item - ${variationOrder.voNumber}`,
        description: `Variation Addition: ${variationOrder.description}`,
        quantity: 1,
        unit: 'LS', // Lump Sum
        rate: netDifference,
        amount: netDifference,
        consumedQuantity: 0,
        remainingQuantity: 1,
        variancePercentage: 0,
      });

      await boqItem.save();

      // Recalculate BOQ totalAmount
      activeBoq.totalAmount += netDifference;
      await activeBoq.save();
    }

    // 3. UPDATE WBS & TASK
    // Find first package in the project to link the task
    let wbsPackage = await Package.findOne({ projectId, organizationId });
    if (!wbsPackage) {
      // Create a fallback package if WBS is empty
      wbsPackage = new Package({
        organizationId,
        projectId,
        name: 'Variations Package',
        trade: 'interior',
      });
      await wbsPackage.save();
    }

    // Add task for execution
    const timelineImpactDays = variationOrder.impactAnalysis.timelineImpactDays || 3;
    const task = new Task({
      organizationId,
      projectId,
      packageId: wbsPackage._id,
      name: `Execute VO: ${variationOrder.voNumber}`,
      description: `Scope adjustment task for Variation Order: ${variationOrder.description}`,
      status: 'todo',
      priority: 'high',
      startDate: new Date(),
      endDate: new Date(Date.now() + timelineImpactDays * 24 * 60 * 60 * 1000),
      assignees: [],
      progress: 0,
      dependencies: [],
    });
    await task.save();

    // 4. GENERATE PROCUREMENT PLAN (PURCHASE ORDER)
    const materialCost = variationOrder.impactAnalysis.materialCost || 0;
    if (materialCost > 0) {
      const poNumber = `PO-VO-${variationOrder.voNumber}`;
      const po = new PurchaseOrder({
        organizationId,
        projectId,
        poNumber,
        vendorName: 'Select Vendor',
        materialName: `Variation Material - ${variationOrder.voNumber}`,
        amount: materialCost,
        currency: 'INR',
        status: 'pending',
        deliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        items: [
          {
            name: `Materials for ${variationOrder.voNumber}`,
            quantity: 1,
            unit: 'LS',
            unitPrice: materialCost,
            amount: materialCost,
          },
        ],
      });
      await po.save();
    }

    // 5. GENERATE CLIENT BILLING LOG
    variationOrder.billingGenerated = true;
    variationOrder.billingGeneratedAt = new Date();

    // 6. UPDATE VO STATUS TO APPROVED
    variationOrder.status = 'approved';
    await variationOrder.save();

    return successResponse(
      {
        variationOrder,
        budgetUpdated: true,
        boqUpdated: !!activeBoq,
        taskCreated: true,
        poCreated: materialCost > 0,
      },
      'Variation order approved and project data updated successfully'
    );
  } catch (error) {
    console.error('Approve variation order error:', error);
    return serverErrorResponse();
  }
}

export const POST = withAuth(approveVoHandler);
