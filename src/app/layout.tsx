import type { Metadata } from "next";
import { DM_Mono, Anonymous_Pro } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  weight: ["300", "400", "500"],
  subsets: ["latin"],
});

const anonPro = Anonymous_Pro({
  variable: "--font-anon-pro",
  weight: ["400", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FixMyPDF — Your PDF is wrong. We'll fix it.",
  description:
    "No toolboxes. Tell FixMyPDF the result you need — a size limit, the pages you keep, or the portal's rules — and the in-browser engine fixes your PDF. 100% private: files never leave your device.",
  keywords: [
    "fix pdf",
    "make pdf fit",
    "compress pdf",
    "extract pdf pages",
    "remove blank pages",
    "pdf too large",
    "file size limit",
  ],
  authors: [{ name: "FixMyPDF" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "FixMyPDF — Your PDF is wrong. We'll fix it.",
    description:
      "Too big? Too many pages? The website says max 2 MB? Fix it in one click — entirely in your browser.",
    siteName: "FixMyPDF",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmMono.variable} ${anonPro.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
