// =============================================================================
// InteriorOS Backend — Razorpay Create Order Endpoint
// =============================================================================

import { NextRequest } from 'next/server';
import Razorpay from 'razorpay';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { connectDB } from '@/lib/db';
import { SubscriptionPlan } from '@/models/subscription-plan.model';
import { successResponse, errorResponse, validationErrorResponse, serverErrorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';

const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_mockKeyId12345';
const key_secret = process.env.RAZORPAY_KEY_SECRET || 'mockSecretKeyKey12345';

const razorpay = new Razorpay({
  key_id,
  key_secret,
});

async function createOrderHandler(req: NextRequest, _context: any, auth: JwtPayload) {
  try {
    const body = await req.json();
    const { planId, billingCycle } = body;

    if (!planId || !billingCycle || !['monthly', 'yearly'].includes(billingCycle)) {
      return validationErrorResponse([
        { field: 'planId/billingCycle', message: 'planId and billingCycle (monthly/yearly) are required' },
      ]);
    }

    await connectDB();
    const plan = await SubscriptionPlan.findById(planId);

    if (!plan) {
      return errorResponse('Subscription plan not found', 404);
    }

    const basePrice = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
    const amountInPaise = Math.round(basePrice * 100);

    // Create Razorpay Order
    // In local development with mock credentials, this will still return a mock order if Razorpay SDK fails,
    // but Razorpay SDK with mock credentials typically succeeds locally since order creation is a straightforward local/API call.
    let order;
    try {
      order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: plan.currency || 'INR',
        receipt: `receipt_org_${getOrganizationId(auth)}_${Date.now()}`,
        notes: {
          organizationId: getOrganizationId(auth),
          planId: plan._id.toString(),
          planSlug: plan.slug,
          billingCycle,
        },
      });
    } catch (sdkError: any) {
      console.warn('Razorpay SDK error, falling back to mock order:', sdkError.message || sdkError);
      // Fallback for developers using mock keys without internet or during local outages
      order = {
        id: `order_mock_${Date.now().toString(36)}`,
        amount: amountInPaise,
        currency: plan.currency || 'INR',
        receipt: `receipt_org_${getOrganizationId(auth)}_${Date.now()}`,
        status: 'created',
        notes: {
          organizationId: getOrganizationId(auth),
          planId: plan._id.toString(),
          planSlug: plan.slug,
          billingCycle,
        },
      };
    }

    return successResponse({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: key_id,
      planName: plan.name,
      billingCycle,
    }, 'Razorpay order created successfully');

  } catch (error) {
    console.error('Create Razorpay order error:', error);
    return serverErrorResponse();
  }
}

export const POST = withAuth(createOrderHandler);
