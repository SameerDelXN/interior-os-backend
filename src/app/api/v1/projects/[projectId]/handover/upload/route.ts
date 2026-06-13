// =============================================================================
// InteriorOS Backend — Handover Documents Upload API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth } from '@/middlewares/auth.middleware';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { successResponse, errorResponse, serverErrorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';

async function uploadHandoverDocumentHandler(
  req: NextRequest,
  context: { params: Promise<Record<string, string>> },
  auth: JwtPayload
) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return errorResponse('No file provided', 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = file.name || 'document.pdf';

    // Upload to Cloudinary inside handover folder
    const secureUrl = await uploadToCloudinary(buffer, 'handover', filename);

    return successResponse({ url: secureUrl }, 'Document uploaded successfully');
  } catch (error) {
    console.error('Handover document upload API error:', error);
    return serverErrorResponse();
  }
}

export const POST = withAuth(uploadHandoverDocumentHandler);
