import type { Metadata, Viewport } from "next";
import {
  Newsreader,
  Nunito_Sans,
  Noto_Serif_TC,
  Noto_Sans_TC,
} from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import "./globals.css";
import { Providers } from "./providers";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Mapsake",
  description: "A private travel keepsake — the map you keep, for the sake of memory.",
  // PWA (Story 4.5): the manifest <link> is auto-injected by the app/manifest.ts file
  // convention. iOS home-screen install (no beforeinstallprompt on iOS) needs apple meta + icon.
  appleWebApp: { capable: true, title: "Mapsake", statusBarStyle: "default" },
  // Declaring `icons` explicitly suppresses the auto <link rel="icon"> that app/icon.png would emit,
  // so list BOTH: the browser-tab favicon + the iOS touch icon. Without `icon` here the tab falls
  // back to /favicon.ico (404) → blank favicon.
  icons: { icon: "/icon.png", apple: "/apple-touch-icon.png" },
};

// theme-color drives the PWA status-bar/toolbar tint — the parchment surface (light-only v1).
export const viewport: Viewport = {
  themeColor: "#F2E8D5",
};

// Latin: serif display + humanist sans
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});
const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

// Traditional Chinese (zh-TW, primary): Song/Ming serif + humanist sans.
// CJK fonts: preload disabled (no Latin subset), loaded on demand.
const notoSerifTC = Noto_Serif_TC({
  weight: ["400", "500", "700"],
  variable: "--font-serif-tc",
  display: "swap",
  preload: false,
});
const notoSansTC = Noto_Sans_TC({
  weight: ["400", "500", "700"],
  variable: "--font-sans-tc",
  display: "swap",
  preload: false,
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // zh-TW is the primary language (Story 6.1: next-intl single-locale, hard-fixed to zh-TW).
    // Light-only v1: no theme provider, no dark toggle.
    <html
      lang="zh-Hant"
      className={`${newsreader.variable} ${nunitoSans.variable} ${notoSerifTC.variable} ${notoSansTC.variable}`}
    >
      <body className="antialiased">
        {/* next-intl provider (Story 6.1) — auto-inherits locale + messages from getRequestConfig;
            wraps the whole tree so every client component can read translations. */}
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
