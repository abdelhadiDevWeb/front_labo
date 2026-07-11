import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

/**
 * Force request-time render so Vercel never serves a truncated/static Flight shell.
 */
export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Keep metadata fully static and point icons only at files that exist in /public.
 * A missing icon URL makes Next.js AsyncMetadata hang → browser "Connection closed"
 * → white screen (hydration never completes, so API calls never run).
 */
export const metadata: Metadata = {
  title: "Market Lab - Marketplace des Laboratoires",
  description: "La marketplace professionnelle des laboratoires d'analyses",
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "any" }],
    apple: [{ url: "/images/logo.jpeg", type: "image/jpeg" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
