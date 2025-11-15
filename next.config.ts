
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
  webpack: (config, { isServer }) => {
    // This is to fix a build error with the 'ssh2' package.
    config.externals.push('cpu-features');
    config.externals.push('sshcrypto.node');
    return config;
  },
};

export default nextConfig;
