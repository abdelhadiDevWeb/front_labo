import type { NextConfig } from "next";

const parseRemotePatternFromApiUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!apiUrl) return null;

  try {
    const parsed = new URL(apiUrl);
    return {
      protocol: parsed.protocol.replace(":", "") as "http" | "https",
      hostname: parsed.hostname,
      port: parsed.port || undefined,
      pathname: "/**",
    };
  } catch {
    return null;
  }
};

const envRemotePattern = parseRemotePatternFromApiUrl();

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
      {
        protocol: "http",
        hostname: "10.142.140.40",
        port: "8000",
        pathname: "/**", // Allow all paths from LAN backend:8000
      },
      ...(envRemotePattern ? [envRemotePattern] : []),
    ],
  },
};

export default nextConfig;
