// =============================================================================
// InteriorOS Backend — CRM Customer Send Quotation / Proforma Invoice Email API
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { connectDB } from '@/lib/db';
import { CrmCustomer } from '@/models/crm-customer.model';
import { CrmActivity } from '@/models/crm-activity.model';
import { sendEmail, quotationInvoiceEmailTemplate } from '@/lib/email';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';
import mongoose from 'mongoose';
import { z } from 'zod';

const sendQuotationEmailSchema = z.object({
  quotation: z.object({
    version: z.number(),
    quotationNumber: z.string().optional(),
    items: z.array(
      z.object({
        description: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
        total: z.number(),
      })
    ),
    subtotal: z.number(),
    taxPercentage: z.number(),
    tax: z.number(),
    discount: z.number(),
    grandTotal: z.number(),
    notes: z.string().optional(),
  }),
  recipientEmail: z.string().trim().email().optional().or(z.literal('')),
});

async function sendQuotationEmailHandler(
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

    const body = await req.json();
    const validation = sendQuotationEmailSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, 400);
    }

    const customer = await CrmCustomer.findOne({ _id: customerId, organizationId });
    if (!customer) {
      return errorResponse('Customer not found', 404);
    }

    const targetEmail = validation.data.recipientEmail || customer.email;
    if (!targetEmail) {
      return errorResponse('Lead does not have an email address specified. Please provide a valid email.', 400);
    }

    const { quotation } = validation.data;
    const qtnLabel = quotation.quotationNumber || `Quotation v${quotation.version}`;
    const emailHtml = quotationInvoiceEmailTemplate(customer.name, quotation, 'InteriorOS');

    // Send email via nodemailer
    await sendEmail({
      to: targetEmail,
      subject: `Proforma Invoice & Quotation (${qtnLabel}) for ${customer.name}`,
      html: emailHtml,
    });

    // Record activity
    await CrmActivity.create({
      customer: customer._id,
      user: auth.userId,
      organizationId,
      type: 'Email',
      status: 'Completed',
      remarks: `Emailed Proforma Invoice & ${qtnLabel} (₹${quotation.grandTotal.toLocaleString('en-IN')}) to ${targetEmail}`,
      completedDate: new Date(),
    });

    return successResponse(
      { emailedTo: targetEmail },
      `Proforma Invoice & Quotation sent successfully to ${targetEmail}`
    );
  } catch (error: any) {
    console.error('Send Quotation Email error:', error);
    return serverErrorResponse();
  }
}

export const POST = withAuth(sendQuotationEmailHandler);
