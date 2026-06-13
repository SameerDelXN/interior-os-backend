// =============================================================================
// InteriorOS Backend — Health Check API
// =============================================================================

import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

export async function GET() {
  const mongoStatus = mongoose.connection.readyState;
  const statusMap: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return NextResponse.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: {
        mongodb: statusMap[mongoStatus] || 'unknown',
      },
    },
  });
}
