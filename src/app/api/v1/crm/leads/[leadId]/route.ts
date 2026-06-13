// =============================================================================
// InteriorOS Backend — CRM Lead Detail API: GET, PUT, DELETE
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { connectDB } from '@/lib/db';
import { CRMLead } from '@/models/crm-lead.model';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';
import mongoose from 'mongoose';

// GET: Fetch lead details
async function getLeadDetailsHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { leadId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return errorResponse('Invalid Lead ID', 400);
    }

    const lead = await CRMLead.findOne({
      _id: leadId,
      organizationId,
      isDeleted: false,
    })
      .populate('assignedDesigner', 'name email')
      .populate('assignedSalesPerson', 'name email');

    if (!lead) {
      return errorResponse('Lead not found', 404);
    }

    return successResponse(lead);
  } catch (error) {
    console.error('Fetch CRM lead details error:', error);
    return serverErrorResponse();
  }
}

// PUT: Update lead details
async function updateLeadHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { leadId } = await context.params;
    const body = await req.json();

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return errorResponse('Invalid Lead ID', 400);
    }

    const lead = await CRMLead.findOne({
      _id: leadId,
      organizationId,
      isDeleted: false,
    });

    if (!lead) {
      return errorResponse('Lead not found or unauthorized', 404);
    }

    // Update fields dynamically
    const fieldsToUpdate = [
      'leadName',
      'phone',
      'email',
      'projectType',
      'budget',
      'location',
      'propertyType',
      'source',
      'stage',
      'urgency',
      'assignedDesigner',
      'assignedSalesPerson',
      'siteVisit',
      'requirements',
    ];

    fieldsToUpdate.forEach((field) => {
      if (body[field] !== undefined) {
        if (field === 'siteVisit' || field === 'requirements') {
          // Merge nested schemas
          lead[field] = { ...lead[field], ...body[field] };
        } else {
          (lead as any)[field] = body[field];
        }
      }
    });

    // Auto-update lead score if key fields changed
    if (body.budget !== undefined || body.urgency !== undefined || body.propertyType !== undefined) {
      let score = 50;
      const budget = body.budget !== undefined ? body.budget : lead.budget;
      const urgency = body.urgency !== undefined ? body.urgency : lead.urgency;
      const propertyType = body.propertyType !== undefined ? body.propertyType : lead.propertyType;

      if (budget > 2000000) score += 20;
      else if (budget > 1000000) score += 10;

      if (urgency === 'high') score += 15;
      else if (urgency === 'medium') score += 5;

      if (propertyType.toLowerCase().includes('3 bhk') || propertyType.toLowerCase().includes('villa')) score += 10;
      lead.leadScore = Math.min(score, 100);
    }

    await lead.save();
    return successResponse(lead, 'Lead details updated successfully');
  } catch (error: any) {
    console.error('Update CRM lead error:', error);
    return serverErrorResponse();
  }
}

// DELETE: Soft delete lead
async function deleteLeadHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { leadId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return errorResponse('Invalid Lead ID', 400);
    }

    const lead = await CRMLead.findOneAndUpdate(
      { _id: leadId, organizationId, isDeleted: false },
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    if (!lead) {
      return errorResponse('Lead not found or unauthorized', 404);
    }

    return successResponse(null, 'Lead deleted successfully');
  } catch (error) {
    console.error('Delete CRM lead error:', error);
    return serverErrorResponse();
  }
}

export const GET = withAuth(getLeadDetailsHandler);
export const PUT = withAuth(updateLeadHandler);
export const DELETE = withAuth(deleteLeadHandler);
