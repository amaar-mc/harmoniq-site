import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const display = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Harmoniq — Tuning in to care",
  description:
    "Personalized AI music therapy and cognitive games for dementia, Alzheimer's, stroke recovery, and Parkinson's patients — with a caregiver dashboard that tracks cognitive progression over time.",
  openGraph: {
    title: "Harmoniq — Tuning in to care",
    description:
      "AI-powered music therapy, cognitive games, and caregiver insights for neurological wellness.",
    url: "https://harmoniq.site",
    siteName: "Harmoniq",
    type: "website",
  },
  metadataBase: new URL("https://harmoniq.site"),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
