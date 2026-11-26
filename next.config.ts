import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["@electric-sql/pglite", "pg", "qrcode"],
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default nextConfig;
