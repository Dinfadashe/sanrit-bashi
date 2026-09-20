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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Prevents the site being framed by another origin (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          // Stops browsers guessing a file's type from its content instead
          // of trusting the Content-Type header we set.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Sends only the origin (not full path/query) to other sites on
          // cross-origin navigation/requests — reduces incidental leakage
          // of loan IDs, tokens, etc. that might appear in a URL.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Camera access is only ever needed for the KYC liveness capture,
          // on our own origin — denied everywhere else, including any
          // embedded/third-party context.
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;