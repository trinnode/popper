import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import { Footer } from "@/components/Footer";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Popper - Falsifiable Investment Thesis on NEAR",
  description:
    "The first on-chain pre-registered investment thesis for NEAR Protocol. Claims committed to NEAR before the data arrived. Anyone can verify. The thesis can lose.",
  openGraph: {
    title: "Popper - Falsifiable Investment Thesis on NEAR",
    description:
      "Pre-registered, falsifiable investment thesis for NEAR Protocol. Committed on-chain before the data arrived. Anyone can verify.",
    type: "website",
    images: ["/logo-full.svg"],
  },
  icons: {
    icon: "/logo-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-bg text-white antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-accent focus:px-4 focus:py-2 focus:text-black"
        >
          Skip to content
        </a>
        <Navbar />
        <main id="main" className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-6">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
