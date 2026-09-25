/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@cargoflow/shared-types',
    '@cargoflow/geometry',
    '@cargoflow/validation',
    '@cargoflow/packing-engine',
    'three',
  ],
  webpack: (config) => {
    config.externals = [...(config.externals || [])];
    return config;
  },
};

export default nextConfig;

