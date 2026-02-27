import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "next-auth/react";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#722f27',
};

export const metadata: Metadata = {
  title: "Rice & Beans Preaching",
  description: "Advanced performance ecosystem for preachers. Study, prepare, and deliver sermons with excellence.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "R&B Preaching",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className={`${inter.variable} ${jetbrains.variable} antialiased`}>
        <SessionProvider>
          <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light">
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
