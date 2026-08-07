// =============================================================================
// InteriorOS Backend — Auth API: Reset Password
// =============================================================================

import { NextRequest } from 'next/server';
import { resetPassword, AppError } from '@/services/auth.service';
import { resetPasswordSchema } from '@/lib/validations';
import { successResponse, errorResponse, validationErrorResponse, serverErrorResponse } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validation = resetPasswordSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return validationErrorResponse(errors);
    }

    const result = await resetPassword(validation.data.email, validation.data.otp, validation.data.newPassword);
    return successResponse(result);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode);
    }
    console.error('Reset password error:', error);
    return serverErrorResponse();
  }
}
