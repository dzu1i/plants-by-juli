import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "glttpnvctscbccxtdhjq.supabase.co",
      },
    ],
  },
};

export default nextConfig;
