import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowLocalIP: true, // Allow images from localhost/127.0.0.1 in development
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/**", // Allow all paths from localhost:8000
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/**", // Allow all paths from 127.0.0.1:8000
      },
    ],
  },
};

export default nextConfig;
