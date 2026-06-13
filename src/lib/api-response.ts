// =============================================================================
// InteriorOS Backend — API Response Helpers
// =============================================================================

import { NextResponse } from 'next/server';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Array<{ field: string; message: string }>;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function successResponse<T>(data: T, message?: string, status = 200) {
  return NextResponse.json(
    { success: true, data, message } satisfies ApiResponse<T>,
    { status }
  );
}

export function createdResponse<T>(data: T, message = 'Created successfully') {
  return successResponse(data, message, 201);
}

export function paginatedResponse<T>(
  data: T[],
  meta: PaginationMeta,
  message?: string
) {
  return NextResponse.json(
    { success: true, data, meta, message } satisfies ApiResponse<T[]>,
    { status: 200 }
  );
}

export function errorResponse(message: string, status = 400, errors?: Array<{ field: string; message: string }>) {
  return NextResponse.json(
    { success: false, error: message, errors } satisfies ApiResponse,
    { status }
  );
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return errorResponse(message, 401);
}

export function forbiddenResponse(message = 'Forbidden') {
  return errorResponse(message, 403);
}

export function notFoundResponse(message = 'Resource not found') {
  return errorResponse(message, 404);
}

export function conflictResponse(message = 'Resource already exists') {
  return errorResponse(message, 409);
}

export function validationErrorResponse(errors: Array<{ field: string; message: string }>) {
  return errorResponse('Validation failed', 422, errors);
}

export function serverErrorResponse(message = 'Internal server error') {
  return errorResponse(message, 500);
}

// ── Pagination Helpers ──────────────────────────────────────────────────────

export interface PaginationParams {
  page: number;
  limit: number;
  sort: string;
  order: 'asc' | 'desc';
}

export function parsePaginationParams(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
  const sort = searchParams.get('sort') || 'createdAt';
  const order = (searchParams.get('order') || 'desc') as 'asc' | 'desc';

  return { page, limit, sort, order };
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
