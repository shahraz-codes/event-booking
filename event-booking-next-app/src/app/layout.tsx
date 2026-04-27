import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { APP_NAME } from "@/lib/config";
import {
  getSiteSettings,
  getResolvedTheme,
} from "@/services/site-settings.service";
import { buildThemeCss } from "@/lib/palette";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const FALLBACK_DESCRIPTION = `${APP_NAME} — Hyderabad's premier banquet hall for weddings, nikah, receptions, engagements, corporate events, and celebrations. Accommodating up to 600 guests with in-house catering, DJ, and décor.`;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: APP_NAME,
    description: settings.metaDescription?.trim() || FALLBACK_DESCRIPTION,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = await getSiteSettings();
  const theme = getResolvedTheme(settings);
  const themeCss = buildThemeCss(theme);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer settings={settings} />
      </body>
    </html>
  );
}
