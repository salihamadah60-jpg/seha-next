import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  },
};

export default nextConfig;
