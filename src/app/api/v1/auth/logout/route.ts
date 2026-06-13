// =============================================================================
// InteriorOS Backend — Auth API: Logout
// =============================================================================

import { NextRequest } from 'next/server';
import { logout } from '@/services/auth.service';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return errorResponse('Refresh token is required', 400);
    }

    const result = await logout(refreshToken);
    return successResponse(result);
  } catch (error) {
    console.error('Logout error:', error);
    return serverErrorResponse();
  }
}
