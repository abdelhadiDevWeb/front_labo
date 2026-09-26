import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/contexts/CartContext";
import ChunkLoadRecovery from "@/components/ChunkLoadRecovery";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  getSiteUrl,
} from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "Dz Labmarket",
    "laboratoire",
    "marketplace laboratoire",
    "réactifs",
    "consommables laboratoire",
    "automates laboratoire",
    "fournisseurs laboratoire Algérie",
    "Blida",
    "analyses médicales",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "marketplace",
  alternates: {
    canonical: "/home",
    languages: { "fr-DZ": "/home" },
  },
  openGraph: {
    type: "website",
    locale: "fr_DZ",
    url: `${siteUrl}/home`,
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "/images/logo.jpeg",
        width: 500,
        height: 500,
        alt: `${SITE_NAME} logo`,
      },
    ],
  },
  twitter: {
    card: "summary",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    images: ["/images/logo.jpeg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Circular PNGs (transparent corners) — Google prefers multiples of 48px
  icons: {
    icon: [
      { url: "/favicon.png?v=6", type: "image/png", sizes: "48x48" },
      { url: "/favicon-96.png?v=6", type: "image/png", sizes: "96x96" },
      { url: "/icon-192.png?v=6", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png?v=6", type: "image/png", sizes: "512x512" },
      { url: "/favicon-32.png?v=6", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-icon.png?v=6", type: "image/png", sizes: "180x180" }],
    shortcut: "/favicon.png?v=6",
  },
  manifest: "/site.webmanifest",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0e7490" },
    { media: "(prefers-color-scheme: dark)", color: "#0b3a6e" },
  ],
  width: "device-width",
  initialScale: 1,
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: siteUrl,
  logo: `${siteUrl}/images/logo.jpeg`,
  description: SITE_DESCRIPTION,
  email: "dzmarketLab@gmail.com",
  telephone: "+213781079959",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Blida",
    addressCountry: "DZ",
  },
  sameAs: [],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: siteUrl,
  description: SITE_DESCRIPTION,
  inLanguage: "fr-DZ",
  potentialAction: {
    "@type": "SearchAction",
    target: `${siteUrl}/products?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd),
          }}
        />
        <CartProvider>
          <ChunkLoadRecovery />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
