import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/manager',
  assetPrefix: '/manager',
  output: 'export',
  trailingSlash: true,
};

export default nextConfig;
