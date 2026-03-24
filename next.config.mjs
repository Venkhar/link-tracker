/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Empêche Next.js de bundler Playwright (modules natifs Node.js uniquement)
  serverExternalPackages: [
    "playwright",
    "playwright-extra",
    "puppeteer-extra-plugin-stealth",
    "puppeteer-extra-plugin-user-data-dir",
    "puppeteer-extra-plugin-user-preferences",
  ],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
