import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/contexts/CartContext";
import ChunkLoadRecovery from "@/components/ChunkLoadRecovery";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dz Labmarket - Marketplace des Laboratoires",
  description:
    "L'écosystème intelligent des laboratoires et de leurs partenaires fournisseurs",
  applicationName: "Dz Labmarket",
  icons: {
    icon: [
      { url: "/favicon.png?v=3", type: "image/png", sizes: "48x48" },
      { url: "/favicon-32.png?v=3", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-icon.png?v=3", type: "image/png", sizes: "180x180" }],
    shortcut: "/favicon.png?v=3",
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
        <CartProvider>
          <ChunkLoadRecovery />
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
