// =============================================================================
// InteriorOS Backend — CRM Customer Detail API: PATCH
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { connectDB } from '@/lib/db';
import { CrmCustomer } from '@/models/crm-customer.model';
import { CrmActivity } from '@/models/crm-activity.model';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';
import mongoose from 'mongoose';

// PATCH: Update a Customer (e.g. Status change)
async function updateCustomerHandler(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> },
  auth: JwtPayload
) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { customerId } = await context.params;
    const data = await req.json();

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return errorResponse('Invalid Customer ID', 400);
    }

    const customer = await CrmCustomer.findOneAndUpdate(
      { _id: customerId, organizationId },
      { $set: data },
      { new: true }
    );

    if (!customer) {
      return errorResponse('Customer not found', 404);
    }

    // If status was changed, log an activity automatically
    if (data.status) {
      await CrmActivity.create({
        customer: customer._id,
        user: auth.userId,
        organizationId,
        type: 'Status Change',
        status: 'Completed',
        remarks: `Lead moved to stage: ${data.status}`,
        completedDate: new Date(),
      });
    }

    return successResponse(customer, 'Customer updated successfully');
  } catch (error: any) {
    console.error('Update CRM customer error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return errorResponse(messages.join(', '), 400);
    }

    return serverErrorResponse();
  }
}

export const PATCH = withAuth(updateCustomerHandler);

// DELETE: Delete a Customer Lead
async function deleteCustomerHandler(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> },
  auth: JwtPayload
) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { customerId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return errorResponse('Invalid Customer ID', 400);
    }

    const customer = await CrmCustomer.findOneAndDelete({ _id: customerId, organizationId });

    if (!customer) {
      return errorResponse('Customer not found', 404);
    }

    // Delete related activities
    await CrmActivity.deleteMany({ customer: customerId, organizationId });

    return successResponse(null, 'Customer lead deleted successfully');
  } catch (error: any) {
    console.error('Delete CRM customer error:', error);
    return serverErrorResponse();
  }
}

export const DELETE = withAuth(deleteCustomerHandler);
