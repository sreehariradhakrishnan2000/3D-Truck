/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  output: 'standalone',

  // Unoptimized images allow static & edge delivery across Cloudflare's Global CDN
  images: {
    unoptimized: true,
  },

  transpilePackages: [
    '@cargoflow/shared-types',
    '@cargoflow/geometry',
    '@cargoflow/validation',
    '@cargoflow/packing-engine',
    'three',
  ],

  // Production Security Headers for Cloudflare Edge
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },

  webpack: (config, { isServer }) => {
    config.externals = [...(config.externals || [])];
    return config;
  },
};

export default nextConfig;
