// =============================================================================
// InteriorOS Backend — CRM Convert Customer/Lead to Project API
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { connectDB } from '@/lib/db';
import { CrmCustomer } from '@/models/crm-customer.model';
import { Project } from '@/models/project.model';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';
import mongoose from 'mongoose';

import { z } from 'zod';

const convertCustomerSchema = z.object({
  startDate: z.coerce.date().optional(),
  remarks: z.string().optional(),
});

async function convertCustomerHandler(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> },
  auth: JwtPayload
) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { customerId } = await context.params;
    const rawBody = await req.json().catch(() => ({}));

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return errorResponse('Invalid Customer ID', 400);
    }

    const validation = convertCustomerSchema.safeParse(rawBody);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, 400);
    }

    const { startDate, remarks } = validation.data;

    const customer = await CrmCustomer.findOne({ _id: customerId, organizationId });

    if (!customer) {
      return errorResponse('Customer not found', 404);
    }

    if (customer.status === 'Won') {
      return errorResponse('Customer is already converted to a Project', 400);
    }

    // Determine accepted quotation (use last one if multiple)
    let acceptedQuotation = null;
    if (customer.quotations && customer.quotations.length > 0) {
      acceptedQuotation =
        customer.quotations.find((q) => q.status === 'Accepted') ||
        customer.quotations[customer.quotations.length - 1];
    }

    const totalBudget = acceptedQuotation ? acceptedQuotation.grandTotal || 0 : 0;

    const count = await Project.countDocuments({ organizationId });
    const code = `PRJ-${String(count + 1).padStart(3, '0')}`;

    const start = new Date(startDate || Date.now());
    const end = new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000);

    const project = new Project({
      organizationId,
      name: `${customer.name}'s ${customer.propertyType || 'Interior'} Project`,
      code,
      client: customer.name,
      type: 'General',
      status: 'active',
      startDate: start,
      endDate: end,
      budget: {
        amount: totalBudget,
        currency: 'INR',
      },
      location: {
        address: customer.propertyAddress || customer.address || customer.projectLocation || '',
        city: customer.city || customer.projectLocation || customer.propertyAddress || customer.address || '',
        state: customer.state || '',
        country: 'India',
        zipCode: customer.pincode || '',
      },
      description: `Automatically converted from Won CRM Customer Lead. Original Lead: ${customer.leadNumber}`,
    });

    await project.save();

    // Update Customer
    customer.status = 'Won';
    customer.linkedProject = project._id as mongoose.Types.ObjectId;
    if (remarks) {
      customer.remarks = (customer.remarks ? customer.remarks + '\n' : '') + `Conversion Remarks: ${remarks}`;
    }

    if (acceptedQuotation) {
      acceptedQuotation.status = 'Accepted';
    }

    await customer.save();

    return successResponse(
      { project, customer },
      'Lead converted to Project successfully'
    );
  } catch (error: any) {
    console.error('Convert CRM customer to Project error:', error);
    return serverErrorResponse();
  }
}

export const POST = withAuth(convertCustomerHandler);
