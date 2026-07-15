import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

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

const buildContentSecurityPolicy = (): string => {
  const connectSrc = new Set<string>(["'self'"]);
  const imgSrc = new Set<string>(["'self'", "data:", "blob:"]);
  const scriptSrc = new Set<string>([
    "'self'",
    "https://maps.googleapis.com",
    "https://maps.gstatic.com",
  ]);
  const styleSrc = new Set<string>([
    "'self'",
    "'unsafe-inline'",
    "https://fonts.googleapis.com",
  ]);
  const fontSrc = new Set<string>(["'self'", "data:", "https://fonts.gstatic.com"]);
  const frameSrc = new Set<string>(["'self'", "https://maps.googleapis.com", "https://www.google.com"]);
  const workerSrc = new Set<string>(["'self'", "blob:"]);

  if (isDev) {
    scriptSrc.add("'unsafe-eval'");
    scriptSrc.add("'unsafe-inline'");
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (apiUrl) {
    try {
      const origin = new URL(apiUrl.replace(/\/api\/?$/, "")).origin;
      connectSrc.add(origin);
      imgSrc.add(origin);
    } catch {
      // ignore
    }
  }

  // Google Maps (JS API + Places + map tiles)
  [
    "https://maps.googleapis.com",
    "https://maps.gstatic.com",
    "https://*.googleapis.com",
    "https://*.gstatic.com",
  ].forEach((origin) => {
    connectSrc.add(origin);
    imgSrc.add(origin);
  });

  connectSrc.add("https://pay.chargily.net");
  connectSrc.add("https://pay.chargily.com");
  connectSrc.add("https://test.pay.chargily.net");
  connectSrc.add("wss:");
  connectSrc.add("ws:");

  return [
    "default-src 'self'",
    `script-src ${Array.from(scriptSrc).join(" ")}`,
    `style-src ${Array.from(styleSrc).join(" ")}`,
    `img-src ${Array.from(imgSrc).join(" ")}`,
    `connect-src ${Array.from(connectSrc).join(" ")}`,
    `font-src ${Array.from(fontSrc).join(" ")}`,
    `frame-src ${Array.from(frameSrc).join(" ")}`,
    `worker-src ${Array.from(workerSrc).join(" ")}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
};

const nextConfig: NextConfig = {
  // Large multipart uploads (Excel / PDFs) go through middleware + /api BFF.
  experimental: {
    middlewareClientMaxBodySize: "50mb",
  },
  async rewrites() {
    const backendBase =
      process.env.API_INTERNAL_URL?.replace(/\/api\/?$/, "").replace(/\/$/, "") ||
      process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "").replace(/\/$/, "") ||
      (isDev ? "http://localhost:8000" : "");

    if (!backendBase) {
      throw new Error("API_INTERNAL_URL or NEXT_PUBLIC_API_URL must be set for API rewrites");
    }

    return [
      {
        source: "/api/:path*",
        destination: `${backendBase}/api/:path*`,
      },
      {
        source: "/socket.io/:path*",
        destination: `${backendBase}/socket.io/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backendBase}/uploads/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          {
            key: "Content-Security-Policy",
            value: buildContentSecurityPolicy(),
          },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      ...(isDev
        ? [
            { protocol: "http" as const, hostname: "localhost", port: "8000", pathname: "/**" },
            { protocol: "http" as const, hostname: "127.0.0.1", port: "8000", pathname: "/**" },
          ]
        : []),
      ...(envRemotePattern ? [envRemotePattern] : []),
    ],
  },
};

export default nextConfig;
