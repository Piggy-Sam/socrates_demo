import type { Metadata, Viewport } from "next";
import { Fraunces, Spectral } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

// Display / brand — characterful old-style serif, optical sizing
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["opsz", "SOFT"],
  style: ["normal", "italic"],
});

// Body serif — the person's own words, read like a commonplace book
const spectral = Spectral({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-spectral",
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://socrates-demo-chi.vercel.app",
  ),
  title: {
    default: "Socrates AI — Think out loud. Know thyself.",
    template: "%s · Socrates AI",
  },
  description:
    "An instrument for the examined life: a voice that calls you each day, draws out your half-formed thoughts, spars with your reasoning, and keeps the record of your mind as it moves.",
  applicationName: "Socrates AI",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1ede4" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1620" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Runs before paint — resolves theme to avoid any flash of the wrong palette.
const NO_FLASH = `(function(){try{var k='socrates-theme';var p=localStorage.getItem(k)||'system';var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=p==='system'?(m?'dark':'light'):p;document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${fraunces.variable} ${spectral.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body className="grain min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
