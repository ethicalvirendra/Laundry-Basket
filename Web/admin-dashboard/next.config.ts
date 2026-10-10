import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/admin',
  assetPrefix: '/admin',
  output: 'export',
  trailingSlash: true,
};

export default nextConfig;
