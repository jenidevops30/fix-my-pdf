import type { Metadata, Viewport } from "next";
import { DM_Mono, DM_Sans, Jost } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

/**
 * Typography system (loaded via next/font/google — self-hosted equivalent of
 * the Google Fonts <head> embed, zero external requests at runtime):
 *  - DM Mono  → buttons, inputs, labels, mono/technical text, h2–h6 headings
 *  - DM Sans  → body copy (variable 100–1000)
 *  - Jost     → display voice for the hero headline (variable 100–900)
 */
const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  weight: ["300", "400", "500"],
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
});

const APP_URL = "https://fixmypdf.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
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
  alternates: { canonical: "/" },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "FixMyPDF — Your PDF is wrong. We'll fix it.",
    description:
      "Too big? Too many pages? The website says max 2 MB? Fix it in one click — entirely in your browser.",
    url: APP_URL,
    siteName: "FixMyPDF",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FixMyPDF — fix PDFs entirely in your browser with zero uploads",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FixMyPDF — Your PDF is wrong. We'll fix it.",
    description:
      "Too big? Too many pages? The website says max 2 MB? Fix it in one click — entirely in your browser.",
    images: ["/og-image.png"],
  },
  applicationName: "FixMyPDF",
  appleWebApp: {
    capable: true,
    title: "FixMyPDF",
    statusBarStyle: "black-translucent",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8faff" },
    { media: "(prefers-color-scheme: dark)", color: "#060c1b" },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmMono.variable} ${dmSans.variable} ${jost.variable} font-sans antialiased bg-background text-foreground min-h-screen flex flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
