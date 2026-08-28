import type { NextConfig } from "next";

const isStaticExport = process.env.EXPORT_STATIC === "1";

const nextConfig: NextConfig = {
  transpilePackages: ["@binder/engine"],
  ...(isStaticExport ? { output: "export" } : {}),
};

export default nextConfig;