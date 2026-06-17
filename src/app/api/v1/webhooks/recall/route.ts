// =============================================================================
// InteriorOS Backend — Recall Webhook Route
// =============================================================================

import { NextRequest } from 'next/server';
import { successResponse, serverErrorResponse } from '@/lib/api-response';
import { processRecallWebhook } from '@/services/mom.service';

export async function POST(req: NextRequest) {
  try {
    // In production, we should verify the Recall webhook signature.
    // For now, we just process the payload.
    const body = await req.json();

    // Fire and forget so we respond 200 immediately to Recall
    processRecallWebhook(body).catch(err => {
      console.error('Failed to process Recall webhook in background:', err);
    });

    return successResponse(null, 'Webhook received');
  } catch (error: any) {
    console.error('Recall Webhook error:', error);
    return serverErrorResponse();
  }
}
