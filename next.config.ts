import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  // better-sqlite3 is a native Node.js addon — keep it out of the webpack bundle.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
