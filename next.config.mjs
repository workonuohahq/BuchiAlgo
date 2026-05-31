/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Use /tmp for build output in sandboxed environments
  distDir: process.env.NODE_ENV === "production" ? ".next" : "/tmp/next-build",
  // Disable type checking during build (for sandbox environments)
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Image optimization
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
