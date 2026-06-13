// =============================================================================
// InteriorOS Backend — Auth API Routes: Signup
// =============================================================================

import { NextRequest } from 'next/server';
import { signup, AppError } from '@/services/auth.service';
import { signupSchema } from '@/lib/validations';
import { createdResponse, errorResponse, validationErrorResponse, serverErrorResponse } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate input
    const validation = signupSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return validationErrorResponse(errors);
    }

    const result = await signup(validation.data);
    return createdResponse(result, 'Account created successfully. Please verify your email.');
  } catch (error) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode);
    }
    console.error('Signup error:', error);
    return serverErrorResponse();
  }
}
