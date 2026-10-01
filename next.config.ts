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
    remotePatterns: [
      // GitHub avatars: `UserResponse.profilePicture` is populated from the
      // GitHub profile during OAuth sign-in.
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        pathname: "/**",
      },
      // Cloudinary is configured on the Spring Boot side.
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },

  // No rewrite to the backend on purpose.
  //
  // There used to be a `/api/backend/:path*` proxy so the browser could call
  // Spring Boot same-origin. Now that every backend call happens server-side
  // (Server Components, Server Actions, Route Handlers) with the bearer token
  // read from an httpOnly cookie, that rewrite would only serve as an
  // unauthenticated, publicly reachable door straight to the API. Removed.
};

export default nextConfig;
