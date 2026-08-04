// =============================================================================
// InteriorOS Backend — Dynamic CORS Middleware
// =============================================================================
//asdfadsfadsfas
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://192.168.1.42:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://192.168.1.34',
  'https://interior-os-frontend.vercel.app',
  'https://interior-os-client.vercel.app',
  'https://new-update-web-sklite.vercel.app',
];

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow all Vercel frontend deployments (*.vercel.app)
  if (/\.vercel\.app$/.test(origin)) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const allowed = isOriginAllowed(origin);
  const allowOriginHeader = allowed && origin ? origin : (ALLOWED_ORIGINS.includes(origin || '') ? origin! : 'http://localhost:3001');

  // Handle preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    if (allowed && origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Organization-Id');
    } else {
      response.headers.set('Access-Control-Allow-Origin', allowOriginHeader);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Organization-Id');
    }
    return response;
  }

  const response = NextResponse.next();
  if (allowed && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
