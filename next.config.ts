import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    // Keep worker/process usage low on constrained hosting plans.
    cpus: isProduction ? 1 : undefined,
    webpackBuildWorker: false,
    workerThreads: false,
    memoryBasedWorkersCount: false,
    // Keep static generation process count low for constrained hosting plans.
    staticGenerationRetryCount: 1,
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 300,
  },
};

export default nextConfig;
