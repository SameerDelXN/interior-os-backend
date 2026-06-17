// =============================================================================
// InteriorOS Backend — Sync Bot Status Route
// =============================================================================

import { NextRequest } from 'next/server';
import { withProjectPermission } from '@/middlewares/project-auth.middleware';
import { successResponse, serverErrorResponse, errorResponse } from '@/lib/api-response';
import { connectDB } from '@/lib/db';
import { MeetingMinutes } from '@/models/mom.model';
import { processRecallWebhook } from '@/services/mom.service';
import type { JwtPayload } from '@/lib/jwt';
import { getOrganizationId } from '@/middlewares/auth.middleware';

async function syncBotHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    const { projectId, momId } = await context.params;
    
    await connectDB();
    const mom = await MeetingMinutes.findOne({ _id: momId, projectId });
    if (!mom || !mom.botId) {
      return errorResponse('Bot session not found', 404);
    }

    const RECALL_API_BASE = process.env.RECALL_API_BASE || 'https://api.recall.ai/api/v1';
    const RECALL_API_KEY = process.env.RECALL_API_KEY;

    // Check bot status directly from Recall
    const botRes = await fetch(`${RECALL_API_BASE}/bot/${mom.botId}`, {
      headers: {
        'Authorization': `Token ${RECALL_API_KEY}`
      }
    });

    if (!botRes.ok) {
      return errorResponse('Failed to check bot status from Recall.ai', 500);
    }

    const botData = await botRes.json();
    
    // Recall.ai stores status in the status_changes array
    const currentStatus = botData.status_changes?.length 
      ? botData.status_changes[botData.status_changes.length - 1].code 
      : botData.status;

    if (currentStatus === 'done') {
      // Manually trigger the webhook logic since localhost can't receive external webhooks
      // Ensure we pass the extracted status to the mock webhook payload
      botData.status = 'done';
      // Fire and forget so we don't block the API response
      processRecallWebhook({
        event: 'bot.status_change',
        data: botData
      }).catch(err => console.error('Background transcription error:', err));
      return successResponse(null, 'Meeting ended! Processing transcript and AI summary...');
    }

    if (currentStatus === 'fatal') {
      mom.title = "Failed to join meeting";
      mom.notes = "Bot encountered a fatal error joining the meeting.";
      await mom.save();
      return successResponse(null, 'Bot failed to join. Marked as failed.');
    }

    return successResponse({ status: currentStatus }, `Bot is currently: ${currentStatus || 'unknown'}`);
  } catch (error: any) {
    console.error('Sync bot error:', error);
    return serverErrorResponse();
  }
}

export const POST = withProjectPermission('mom', 'update', syncBotHandler);
