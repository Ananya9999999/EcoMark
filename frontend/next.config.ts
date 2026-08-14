import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React's dev-only double-mount tears down and recreates the WebGL
  // context behind the globe, which react-three-fiber does not recover
  // from — the canvas renders blank in `next dev` only. Production builds
  // are unaffected either way.
  reactStrictMode: false,
};

export default nextConfig;
