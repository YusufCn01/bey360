import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep static generation process count low for constrained hosting plans.
    staticGenerationRetryCount: 1,
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 300,
  },
};

export default nextConfig;
