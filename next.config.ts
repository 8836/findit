import type { NextConfig } from "next";

// Additional dev origins can be supplied as a comma-separated list.
// e.g. NEXT_PUBLIC_DEV_ORIGINS="192.168.1.6,192.168.1.7,*.local-origin.dev"
const extraDevOrigins = (process.env.NEXT_PUBLIC_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  // Trusted origins allowed to request the development server.
  // The platform preview is served from *.e2b.app.
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "*.e2b.app",
    ...extraDevOrigins,
  ],

  // Deterministic output for smaller, cacheable bundles.
  poweredByHeader: false,
};

export default nextConfig;
