// =============================================================================
// InteriorOS Backend — Chat API (GET History, POST Message)
// =============================================================================

import { NextRequest } from 'next/server';
import { withProjectPermission } from '@/middlewares/project-auth.middleware';
import { successResponse, createdResponse, serverErrorResponse, validationErrorResponse, errorResponse } from '@/lib/api-response';
import { getChatHistory, sendMessage } from '@/services/chat.service';
import type { JwtPayload } from '@/lib/jwt';
import { z } from 'zod';
import { AppError } from '@/services/auth.service';

const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long').trim(),
});

// GET: Fetch Chat History
async function getChatHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    const { projectId } = await context.params;
    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const messages = await getChatHistory(projectId, limit);
    return successResponse(messages);
  } catch (error) {
    console.error('Get chat history error:', error);
    return serverErrorResponse();
  }
}

// POST: Send a Chat Message
async function sendChatHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    const { projectId } = await context.params;
    const body = await req.json();

    const validation = sendMessageSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return validationErrorResponse(errors);
    }

    const message = await sendMessage(projectId, auth.userId, validation.data.content);
    return createdResponse(message, 'Message sent successfully');
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode);
    }
    console.error('Send message error:', error);
    return serverErrorResponse();
  }
}

// Ensure the user has at least read access to the project to chat
export const GET = withProjectPermission('projects', 'read', getChatHandler);
export const POST = withProjectPermission('projects', 'read', sendChatHandler);
