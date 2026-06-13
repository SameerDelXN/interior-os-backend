// =============================================================================
// InteriorOS Backend — Auth API: Forgot Password
// =============================================================================

import { NextRequest } from 'next/server';
import { forgotPassword, AppError } from '@/services/auth.service';
import { forgotPasswordSchema } from '@/lib/validations';
import { successResponse, errorResponse, validationErrorResponse, serverErrorResponse } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return validationErrorResponse(errors);
    }

    const result = await forgotPassword(validation.data.email);
    return successResponse(result);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode);
    }
    console.error('Forgot password error:', error);
    return serverErrorResponse();
  }
}
