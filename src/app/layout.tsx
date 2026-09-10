import type { Metadata } from "next";
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
