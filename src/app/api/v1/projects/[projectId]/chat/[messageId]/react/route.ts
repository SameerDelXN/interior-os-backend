// =============================================================================
// InteriorOS Backend — Chat Message Reactions API
// =============================================================================

import { NextRequest } from 'next/server';
import { withProjectPermission } from '@/middlewares/project-auth.middleware';
import { successResponse, serverErrorResponse, validationErrorResponse, errorResponse } from '@/lib/api-response';
import { toggleReaction } from '@/services/chat.service';
import type { JwtPayload } from '@/lib/jwt';
import { z } from 'zod';
import { AppError } from '@/services/auth.service';

const reactSchema = z.object({
  emoji: z.string().min(1, 'Emoji is required'),
});

async function reactHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    const { messageId } = await context.params;
    const body = await req.json();

    const validation = reactSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return validationErrorResponse(errors);
    }

    const message = await toggleReaction(messageId, auth.userId, validation.data.emoji);
    return successResponse(message, 'Reaction updated successfully');
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode);
    }
    console.error('React message error:', error);
    return serverErrorResponse();
  }
}

export const POST = withProjectPermission('projects', 'read', reactHandler);
