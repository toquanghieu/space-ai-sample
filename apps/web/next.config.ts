import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Monorepo: pin the workspace root so Next does not warn about multiple lockfiles.
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
