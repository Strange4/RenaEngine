import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // better-sqlite3 is a native module; it must load from node_modules, not the bundle.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
