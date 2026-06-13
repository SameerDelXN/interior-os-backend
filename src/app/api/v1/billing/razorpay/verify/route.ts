// =============================================================================
// InteriorOS Backend — Razorpay Verify Payment Endpoint
// =============================================================================

import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { connectDB } from '@/lib/db';
import { Organization } from '@/models/organization.model';
import { SubscriptionPlan } from '@/models/subscription-plan.model';
import { successResponse, errorResponse, validationErrorResponse, serverErrorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';

const key_secret = process.env.RAZORPAY_KEY_SECRET || 'mockSecretKeyKey12345';

async function verifyPaymentHandler(req: NextRequest, _context: any, auth: JwtPayload) {
  try {
    const body = await req.json();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, planId, billingCycle } = body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !planId || !billingCycle) {
      return validationErrorResponse([
        { field: 'paymentDetails', message: 'Missing Razorpay payment/order/signature details or plan selection' },
      ]);
    }

    await connectDB();

    // 1. Signature Verification
    const isMockOrder = razorpay_order_id.startsWith('order_mock_');
    let isSignatureValid = false;

    if (isMockOrder) {
      // Allow mock orders to verify successfully for local testing
      isSignatureValid = true;
    } else {
      const generatedSignature = crypto
        .createHmac('sha256', key_secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      isSignatureValid = generatedSignature === razorpay_signature;
    }

    if (!isSignatureValid) {
      return errorResponse('Payment signature verification failed', 400);
    }

    // 2. Fetch Plan
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return errorResponse('Subscription plan not found', 404);
    }

    // 3. Update Organization
    const organizationId = getOrganizationId(auth);
    const org = await Organization.findById(organizationId);

    if (!org) {
      return errorResponse('Organization not found', 404);
    }

    const durationDays = billingCycle === 'monthly' ? 30 : 365;
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + durationDays);

    org.subscription = {
      plan: plan.slug as any,
      planId: plan._id,
      status: 'active',
      currentPeriodEnd,
      trialEndsAt: org.subscription?.trialEndsAt // preserve trial start date if any
    };

    await org.save();

    return successResponse({
      subscription: org.subscription,
      organizationName: org.name
    }, 'Subscription activated successfully');

  } catch (error) {
    console.error('Verify Razorpay payment error:', error);
    return serverErrorResponse();
  }
}

export const POST = withAuth(verifyPaymentHandler);
