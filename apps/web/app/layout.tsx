import type { Metadata } from "next";
import { Playfair_Display, Outfit, Lora, JetBrains_Mono } from "next/font/google";
import "./globals.css";
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair-display" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  title: "Preachfy - NUI Pulpit Engine",
  description: "Advanced performance ecosystem for preachers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${playfair.variable} ${outfit.variable} ${lora.variable} ${jetbrains.variable} antialiased font-sans bg-background text-foreground`}>
        <SessionProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
