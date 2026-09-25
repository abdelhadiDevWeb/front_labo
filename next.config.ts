import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const isProd = process.env.NODE_ENV === "production";

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

const resolveApiOrigin = (): string | null => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!apiUrl) return null;
  try {
    return new URL(apiUrl.replace(/\/api\/?$/, "")).origin;
  } catch {
    return null;
  }
};

const buildContentSecurityPolicy = (): string => {
  const connectSrc = new Set<string>(["'self'"]);
  const imgSrc = new Set<string>(["'self'", "data:", "blob:"]);
  const scriptSrc = new Set<string>([
    "'self'",
    // Next.js App Router streams page data via inline <script> tags
    "'unsafe-inline'",
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
  }

  const apiOrigin = resolveApiOrigin();
  if (apiOrigin) {
    connectSrc.add(apiOrigin);
    imgSrc.add(apiOrigin);
    // Socket.IO over the same API host
    connectSrc.add(apiOrigin.replace(/^http/, "ws"));
  }

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
  connectSrc.add("https://pay.chargily.dz");
  connectSrc.add("http://pay.chargily.dz");
  connectSrc.add("https://test.pay.chargily.net");
  frameSrc.add("https://pay.chargily.net");
  frameSrc.add("https://pay.chargily.com");
  frameSrc.add("https://pay.chargily.dz");
  frameSrc.add("http://pay.chargily.dz");
  frameSrc.add("https://test.pay.chargily.net");

  if (isDev) {
    connectSrc.add("ws:");
    connectSrc.add("wss:");
  }

  const directives = [
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
    "form-action 'self' https://pay.chargily.net https://pay.chargily.com https://pay.chargily.dz http://pay.chargily.dz https://test.pay.chargily.net",
    "frame-ancestors 'none'",
  ];

  if (isProd) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
};

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  compress: true,
  experimental: {
    middlewareClientMaxBodySize: "50mb",
    optimizePackageImports: ["lucide-react", "@react-google-maps/api"],
  },
  async rewrites() {
    const rawBackend =
      process.env.API_INTERNAL_URL?.trim() ||
      process.env.NEXT_PUBLIC_API_URL?.trim() ||
      "";
    const withProtocol = rawBackend
      ? /^https?:\/\//i.test(rawBackend)
        ? rawBackend
        : `https://${rawBackend}`
      : "";

    const backendBase =
      withProtocol.replace(/\/api\/?$/, "").replace(/\/$/, "") ||
      (isDev ? "http://localhost:8000" : "");

    if (!backendBase) {
      console.error(
        "[next.config] API_INTERNAL_URL or NEXT_PUBLIC_API_URL is not set — socket.io rewrite disabled."
      );
      return [];
    }

    if (!isDev && /localhost|127\.0\.0\.1/i.test(backendBase)) {
      console.error(
        "[next.config] Backend URL points to localhost in production. Set NEXT_PUBLIC_API_URL (or API_INTERNAL_URL) to your public backend URL."
      );
    }

    return [
      {
        source: "/socket.io/:path*",
        destination: `${backendBase}/socket.io/:path*`,
      },
    ];
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(self)",
      },
      {
        key: "Content-Security-Policy",
        value: buildContentSecurityPolicy(),
      },
    ];

    if (isProd) {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      ...(isDev
        ? [
            {
              protocol: "http" as const,
              hostname: "localhost",
              port: "8000",
              pathname: "/**",
            },
            {
              protocol: "http" as const,
              hostname: "127.0.0.1",
              port: "8000",
              pathname: "/**",
            },
          ]
        : []),
      ...(envRemotePattern ? [envRemotePattern] : []),
    ],
  },
};

export default nextConfig;
