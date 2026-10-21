import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const sans = IBM_Plex_Sans({ variable: "--font-plex-sans", subsets: ["latin"], weight: ["400", "500", "600"] });
const mono = IBM_Plex_Mono({ variable: "--font-plex-mono", subsets: ["latin"], weight: ["400", "500", "600"] });
const display = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], weight: ["500", "600"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: { default: "Tradepost", template: "%s · Tradepost" },
  description: "Buy and sell Roblox game items for in-game currency. Every trade on record.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable} ${display.variable} antialiased min-h-screen flex flex-col`}>
        <SiteHeader />
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
