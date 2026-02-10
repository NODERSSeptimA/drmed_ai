import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["bcryptjs"],
  allowedDevOrigins: ["testaiassist.site"],
};

export default nextConfig;
