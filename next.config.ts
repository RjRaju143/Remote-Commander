import type {NextConfig} from 'next';
import {
  NextResponse
} from "next/server";
const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer, nextRuntime }) => {
    if (isServer) {
        config.externals.push({
            'ws': 'ws',
            'ssh2': 'commonjs ssh2',
        });
    }
    return config;
  },
  async rewrites() {
    return [
        {
            source: '/api/ws',
            destination: '/api/ws'
        }
    ]
  }
};

export default nextConfig;
