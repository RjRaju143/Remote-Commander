import type {NextConfig} from 'next';

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
    // Avoid bundling ssh2 and ws on the client
    if (!isServer) {
        config.externals.push('ssh2', 'ws');
    }
    
    // For server-side, if it's not the edge runtime, we can treat ssh2 as commonjs
    if (isServer && nextRuntime === 'nodejs') {
        config.externals.push({
            ssh2: 'commonjs ssh2',
            ws: 'commonjs ws'
        });
    }
    
    return config;
  }
};

export default nextConfig;
