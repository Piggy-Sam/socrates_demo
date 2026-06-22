import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

// Brand / titles / labels — a refined terminal monospace that signals intelligence
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plex-mono",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://socrates-demo-chi.vercel.app",
  ),
  title: {
    default: "Socrates AI — An instrument for the examined life",
    template: "%s · Socrates AI",
  },
  description:
    "An instrument for the examined life. It doesn't hand you answers — it asks the questions that sharpen your own thinking, presses on your reasoning, and keeps the record of your mind as it moves.",
  applicationName: "Socrates AI",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
  width: "device-width",
  initialScale: 1,
};

// Runs before paint — resolves theme to avoid any flash. Light-first.
const NO_FLASH = `(function(){try{var k='socrates-theme';var p=localStorage.getItem(k)||'system';var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=p==='system'?(m?'dark':'light'):p;document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} ${plexMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: NO_FLASH }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
