import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VMG MATE",
  description: "Multi-Agent Tooling Ecosystem — Hệ sinh thái cộng tác thông minh VMG",
  openGraph: {
    title: "VMG MATE",
    description: "Multi-Agent Tooling Ecosystem — Hệ sinh thái cộng tác thông minh VMG",
    type: "website",
    locale: "vi_VN",
  },
  twitter: {
    card: "summary",
    title: "VMG MATE",
    description: "Multi-Agent Tooling Ecosystem — Hệ sinh thái cộng tác thông minh VMG",
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
