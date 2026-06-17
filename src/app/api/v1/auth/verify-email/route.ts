// =============================================================================
// InteriorOS Backend — Auth API: Verify Email
// =============================================================================

import { NextRequest } from 'next/server';
import { verifyEmail, AppError } from '@/services/auth.service';
import { verifyEmailSchema } from '@/lib/validations';
import { successResponse, errorResponse, validationErrorResponse, serverErrorResponse } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validation = verifyEmailSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return validationErrorResponse(errors);
    }

    const result = await verifyEmail(validation.data.email, validation.data.otp);
    return successResponse(result);
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode);
    }
    console.error('Verify email error:', error);
    return serverErrorResponse();
  }
}
