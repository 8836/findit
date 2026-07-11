import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow multiple LAN IPs so dev resources can be accessed
  allowedDevOrigins: ["192.168.1.6", "192.168.1.7"],
};

export default nextConfig;
