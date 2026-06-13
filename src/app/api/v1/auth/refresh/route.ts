// =============================================================================
// InteriorOS Backend — Auth API Routes: Refresh, Forgot, Reset, Verify, Logout
// =============================================================================

import { NextRequest } from 'next/server';
import { refreshAccessToken, AppError } from '@/services/auth.service';
import { refreshTokenSchema } from '@/lib/validations';
import { successResponse, errorResponse, validationErrorResponse, serverErrorResponse } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validation = refreshTokenSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return validationErrorResponse(errors);
    }

    const result = await refreshAccessToken(validation.data.refreshToken);
    return successResponse(result, 'Token refreshed successfully');
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode);
    }
    console.error('Refresh token error:', error);
    return serverErrorResponse();
  }
}
