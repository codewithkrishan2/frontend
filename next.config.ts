import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Fail the production build on type errors rather than shipping them.
  // (Linting is no longer part of `next build` as of Next.js 16 — run
  // `npm run lint` separately or in CI.)
  typescript: {
    ignoreBuildErrors: false,
  },

  images: {
    // Cloudinary is configured on the Spring Boot side, so remote images will
    // most likely be served from there. Add more patterns as needed.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },

  // Reverse-proxy the Spring Boot API through Next.js in development so the
  // browser stays on a single origin (no CORS preflight, cookies just work).
  // Wiring the actual endpoints comes later.
  async rewrites() {
    const apiOrigin = process.env.API_PROXY_ORIGIN;

    if (!apiOrigin) {
      return [];
    }

    return [
      {
        source: "/api/backend/:path*",
        destination: `${apiOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
