// =============================================================================
// InteriorOS Backend — CRM Convert Customer/Lead to Project API
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { connectDB } from '@/lib/db';
import { CrmCustomer } from '@/models/crm-customer.model';
import { Project } from '@/models/project.model';
import { Drawing } from '@/models/drawing.model';
import { BOQ, BOQItem } from '@/models/boq.model';
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

    if (customer.status === 'Won' || customer.status === 'Converted') {
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

    // Determine project type based on propertyType
    let projectType: 'Commercial Office' | 'Residential' | 'Tech Office' | 'General' = 'General';
    if (customer.propertyType === 'Flat' || customer.propertyType === 'Villa') {
      projectType = 'Residential';
    } else if (customer.propertyType === 'Office' || customer.propertyType === 'Shop') {
      projectType = 'Commercial Office';
    }

    // Find highest PRJ number for organization to avoid collisions if projects were deleted
    const existingProjects = await Project.find({
      organizationId,
      code: { $regex: /^PRJ-\d+$/ },
    })
      .select('code')
      .lean();

    let maxPrjNum = 0;
    for (const p of existingProjects) {
      if (p.code) {
        const match = p.code.match(/^PRJ-(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxPrjNum) {
            maxPrjNum = num;
          }
        }
      }
    }

    const code = `PRJ-${String(maxPrjNum + 1).padStart(3, '0')}`;

    const start = new Date(startDate || Date.now());
    const end = new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000);

    const project = new Project({
      organizationId,
      name: `${customer.name}'s ${customer.propertyType || 'Interior'} Project`,
      code,
      client: customer.name,
      type: projectType,
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

    // 1. Carry over Design Files / Drawings if any
    if (customer.designFiles && customer.designFiles.length > 0) {
      for (let i = 0; i < customer.designFiles.length; i++) {
        const file = customer.designFiles[i];
        try {
          const drawing = new Drawing({
            organizationId,
            projectId: project._id,
            drawingNumber: `DWG-${String(i + 1).padStart(3, '0')}`,
            title: file.name || `Design File ${i + 1}`,
            discipline: file.category?.toLowerCase() === '3d' ? 'shop' : 'tender',
            status: 'approved',
            revisions: [
              {
                revision: 'R0',
                url: file.url,
                uploadedBy: auth.userId,
                changes: 'Initial design transferred from CRM Lead',
                createdAt: file.uploadedAt || new Date(),
              },
            ],
          });
          await drawing.save();
        } catch (dwgErr) {
          console.warn('Failed to copy drawing to project:', dwgErr);
        }
      }
    }

    // 2. Carry over BOQ if any
    if (customer.boqs && customer.boqs.length > 0) {
      const latestBoq = customer.boqs[customer.boqs.length - 1];
      if (latestBoq && latestBoq.items && latestBoq.items.length > 0) {
        try {
          const projectBoq = new BOQ({
            organizationId,
            projectId: project._id,
            version: 1,
            versionLabel: 'v1.0',
            status: 'approved',
            totalAmount: latestBoq.totalAmount || 0,
            currency: 'INR',
            notes: `Transferred from CRM Lead ${customer.leadNumber}`,
            createdBy: auth.userId,
          });
          await projectBoq.save();

          const boqItemDocs = latestBoq.items.map((item: any, idx: number) => ({
            organizationId,
            projectId: project._id,
            boqId: projectBoq._id,
            serialNumber: item.serialNumber || idx + 1,
            category: item.category || 'General',
            itemName: item.itemName || 'Item',
            description: item.description || '',
            quantity: item.quantity || 1,
            unit: item.unit || 'Nos',
            rate: item.rate || 0,
            amount: item.amount || 0,
            consumedQuantity: 0,
            remainingQuantity: item.quantity || 1,
            variancePercentage: 0,
          }));

          await BOQItem.insertMany(boqItemDocs);
        } catch (boqErr) {
          console.warn('Failed to copy BOQ to project:', boqErr);
        }
      }
    }

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
