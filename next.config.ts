import type { NextConfig } from "next";

// Forced next.config reload to clear compilation cache
const nextConfig: NextConfig = {
  serverExternalPackages: ['mongoose', 'bcryptjs', 'jsonwebtoken', 'nodemailer', 'ioredis', 'bullmq'],
  allowedDevOrigins: ['192.168.1.42', 'localhost:3000', 'localhost:3001'],
  async headers() {
    return [
      {
        source: '/uploads/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
};

export default nextConfig;
