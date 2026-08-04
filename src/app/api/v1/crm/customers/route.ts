// =============================================================================
// InteriorOS Backend — CRM Customers API: List & Create
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { connectDB } from '@/lib/db';
import { CrmCustomer } from '@/models/crm-customer.model';
import { successResponse, createdResponse, serverErrorResponse, errorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';
import { z } from 'zod';

const createCustomerSchema = z.object({
  leadSource: z
    .enum([
      'Phone Call',
      'Walk-in',
      'Referral',
      'Existing Customer',
      'Builder Reference',
      'Architect Reference',
      'Society Reference',
      'Social Media',
      'Other',
    ])
    .optional(),
  name: z.string().min(1, 'Please provide customer name'),
  mobileNumber: z.string().min(1, 'Please provide mobile number'),
  alternateNumber: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  propertyType: z.enum(['Flat', 'Villa', 'Office', 'Shop', 'Other']).optional(),
  propertyAddress: z.string().optional(),
  projectLocation: z.string().optional(),
  assignedSalesExecutive: z.string().optional(),
  designerAssigned: z.string().optional(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  budgetRange: z.string().optional(),
  possessionDate: z.coerce.date().optional(),
  remarks: z.string().optional(),
});

// GET: List all customers/leads
async function getCustomersHandler(req: NextRequest, _context: any, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');

    const query: any = { organizationId };
    if (status) query.status = status;

    const customers = await CrmCustomer.find(query)
      .populate('assignedSalesExecutive', 'firstName lastName email')
      .populate('designerAssigned', 'firstName lastName email')
      .sort({ createdAt: -1 });

    return successResponse(customers);
  } catch (error) {
    console.error('List CRM customers error:', error);
    return serverErrorResponse();
  }
}

// POST: Create a new Lead/Customer
async function createCustomerHandler(req: NextRequest, _context: any, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const body = await req.json();

    const validation = createCustomerSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, 400);
    }

    // Auto-generate Lead Number (e.g. LD-1001), scoped to organization
    const count = await CrmCustomer.countDocuments({ organizationId });
    const leadNumber = `LD-${1001 + count}`;

    const customer = new CrmCustomer({
      ...validation.data,
      leadNumber,
      organizationId,
      createdBy: auth.userId,
      status: 'New Lead',
    });

    await customer.save();
    return createdResponse(customer, 'Customer lead created successfully');
  } catch (error: any) {
    console.error('Create CRM customer error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err: any) => err.message);
      return errorResponse(messages.join(', '), 400);
    }

    if (error.code === 11000) {
      return errorResponse('Duplicate entry found for unique field', 400);
    }

    return serverErrorResponse();
  }
}

export const GET = withAuth(getCustomersHandler);
export const POST = withAuth(createCustomerHandler);
