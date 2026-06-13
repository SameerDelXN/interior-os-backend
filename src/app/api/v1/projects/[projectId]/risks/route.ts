// =============================================================================
// InteriorOS Backend — Risks API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { withAuth, getOrganizationId } from '@/middlewares/auth.middleware';
import { connectDB } from '@/lib/db';
import { Risk } from '@/models/risk.model';
import { successResponse, createdResponse, serverErrorResponse, errorResponse } from '@/lib/api-response';
import type { JwtPayload } from '@/lib/jwt';

// GET: Retrieve all risks for the project
async function getRisksHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;

    const risks = await Risk.find({ projectId, organizationId }).sort({ createdAt: -1 });
    return successResponse(risks);
  } catch (error) {
    console.error('Get risks error:', error);
    return serverErrorResponse();
  }
}

// POST: Add a new risk
async function createRiskHandler(req: NextRequest, context: { params: Promise<Record<string, string>> }, auth: JwtPayload) {
  try {
    await connectDB();
    const organizationId = getOrganizationId(auth);
    const { projectId } = await context.params;
    const body = await req.json();

    const { description, probability, impact } = body;
    if (!description || !probability || !impact) {
      return errorResponse('description, probability, and impact are required', 400);
    }

    const probScore = probability === 'high' ? 3 : probability === 'medium' ? 2 : 1;
    const impScore = impact === 'high' ? 3 : impact === 'medium' ? 2 : 1;
    const score = probScore * impScore;

    const newRisk = new Risk({
      ...body,
      score,
      projectId,
      organizationId,
      owner: body.owner || auth.userId,
    });

    await newRisk.save();
    return createdResponse(newRisk, 'Risk logged successfully');
  } catch (error) {
    console.error('Create risk error:', error);
    return serverErrorResponse();
  }
}

export const GET = withAuth(getRisksHandler);
export const POST = withAuth(createRiskHandler);
