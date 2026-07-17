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
  // One-by-one / Excel uploads (images + PDF) go through the Next rewrite proxy.
  // Default buffer is 10MB and truncates the body → backend hang / create fails.
  experimental: {
    // Allow large multipart bodies through Next middleware (Excel / image uploads).
    middlewareClientMaxBodySize: "50mb",
  },
  async rewrites() {
    // Normalize missing https:// (common Hostinger env paste mistake).
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

    // Never throw here: a throw breaks `next build`/boot on Vercel & Hostinger.
    if (!backendBase) {
      console.error(
        "[next.config] API_INTERNAL_URL or NEXT_PUBLIC_API_URL is not set — socket.io rewrite disabled. Realtime features won't work until it is set."
      );
      return [];
    }

    if (!isDev && /localhost|127\.0\.0\.1/i.test(backendBase)) {
      console.error(
        "[next.config] Backend URL points to localhost in production. Set NEXT_PUBLIC_API_URL (or API_INTERNAL_URL) to your public backend URL."
      );
    }

    // /api/* is handled by app/api/[...path]/route.ts (BFF) so Set-Cookie
    // becomes first-party on Hostinger. Only socket.io still uses a rewrite.
    return [
      {
        source: "/socket.io/:path*",
        destination: `${backendBase}/socket.io/:path*`,
      },
    ];
  },
  async headers() {
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
