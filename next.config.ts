import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to this project so the parent
  // C:/Users/shiba/package-lock.json (an unrelated Firebase project)
  // is not picked up as the inferred root.
  turbopack: {
    root: path.resolve(import.meta.dirname),
  },
};

export default nextConfig;
