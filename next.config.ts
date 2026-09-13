import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB. Raised to fit the largest upload we accept — an
      // 8MB disbursement receipt (kyc.ts and admin-loans.ts each enforce
      // their own, smaller caps once a file actually arrives).
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;