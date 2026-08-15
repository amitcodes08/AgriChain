import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito, Playfair_Display } from "next/font/google";
import "./globals.css";

/**
 * Three typographic voices:
 *   • Nunito   — body copy, highly legible at small sizes
 *   • Baloo 2  — headings, heavy rounded weights match the illustrations
 *   • Playfair Display — editorial italic accent for taglines and quotes
 */
const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
  weight: ["400", "600", "700", "800"],
});

const baloo = Baloo_2({
  subsets: ["latin"],
  variable: "--font-baloo",
  display: "swap",
  weight: ["600", "700", "800"],
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-accent",
  display: "swap",
  style: ["normal", "italic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AgriChain Trace — Farmer Dashboard",
  description:
    "Register crop batches, get an instant AI quality check, and follow your produce from the field to the buyer — with every step recorded on chain.",
};

export const viewport: Viewport = {
  themeColor: "#22c34c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${nunito.variable} ${baloo.variable} ${playfair.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
