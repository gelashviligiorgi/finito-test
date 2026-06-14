import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  distDir: process.env.NEXT_TEST_MODE ? ".next-test" : ".next",
};

export default nextConfig;
