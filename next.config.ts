import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir:
    process.env.NEXT_DIST_DIR ?? (process.env.NODE_ENV === "development" ? ".next-dev" : ".next"),
  allowedDevOrigins: ["127.0.0.1", "127.0.0.1:3100"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb"
    }
  }
};

export default nextConfig;
