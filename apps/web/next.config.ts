import type { NextConfig } from "next";
import path from "node:path";

const root = path.join(__dirname, "..", "..");

const nextConfig: NextConfig = {
  // Self-contained server build for Docker (only traced deps shipped).
  output: "standalone",
  // Monorepo: trace/resolve from the workspace root (also silences the lockfile warning).
  outputFileTracingRoot: root,
  turbopack: {
    root,
  },
};

export default nextConfig;
