// =============================================================================
// InteriorOS Backend — Default Project-Level Permission Presets API
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth } from '@/middlewares/auth.middleware';
import { successResponse } from '@/lib/api-response';
import { DEFAULT_PROJECT_PERMISSIONS } from '@/lib/project-permissions';

async function getPresetsHandler(req: NextRequest) {
  return successResponse(DEFAULT_PROJECT_PERMISSIONS);
}

export const GET = withAuth(getPresetsHandler);
