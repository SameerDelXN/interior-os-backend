// =============================================================================
// InteriorOS Backend — Inventory API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { connectDB } from '@/lib/db';
import { Inventory } from '@/models/inventory.model';
import { successResponse, notFoundResponse, serverErrorResponse, errorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';
import { z } from 'zod';

const logInstallSchema = z.object({
  inventoryId: z.string(),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  notes: z.string().optional(),
});

// GET: Retrieve inventory list for a project
async function getInventoryHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;

    const inventoryItems = await Inventory.find({ projectId, organizationId, isDeleted: false })
      .sort({ productName: 1 });

    return successResponse(inventoryItems);
  } catch (error) {
    console.error('Get inventory error:', error);
    return serverErrorResponse();
  }
}

// POST: Log a material installation
async function logInstallationHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;
    const body = await req.json();

    const validation = logInstallSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, 400);
    }

    const { inventoryId, quantity, notes } = validation.data;

    const item = await Inventory.findOne({ _id: inventoryId, projectId, organizationId, isDeleted: false });
    if (!item) {
      return notFoundResponse('Inventory item not found');
    }

    // Business validation: cannot install more than received
    const currentAvailable = item.totalReceived - item.installedQuantity;
    if (quantity > currentAvailable) {
      return errorResponse(`Insufficient inventory stock. Only ${currentAvailable} ${item.unit} available for installation.`, 400);
    }

    // Log the installation
    item.installedQuantity += quantity;
    item.installHistory.push({
      quantity,
      notes,
      date: new Date(),
    });

    await item.save();

    return successResponse(item, 'Material installation logged successfully');
  } catch (error) {
    console.error('Log installation error:', error);
    return serverErrorResponse();
  }
}

export const GET = withAuth(getInventoryHandler);
export const POST = withAuth(logInstallationHandler);
