import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

// Mapsake — light-only v1. Colors are channel triplets in app/globals.css,
// wrapped here so Tailwind opacity modifiers (bg-primary/90, etc.) work.
const c = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: c("--background"),
        foreground: c("--foreground"),
        card: {
          DEFAULT: c("--card"),
          foreground: c("--card-foreground"),
        },
        popover: {
          DEFAULT: c("--popover"),
          foreground: c("--popover-foreground"),
        },
        primary: {
          DEFAULT: c("--primary"),
          foreground: c("--primary-foreground"),
        },
        secondary: {
          DEFAULT: c("--secondary"),
          foreground: c("--secondary-foreground"),
        },
        muted: {
          DEFAULT: c("--muted"),
          foreground: c("--muted-foreground"),
        },
        accent: {
          DEFAULT: c("--accent"),
          foreground: c("--accent-foreground"),
        },
        destructive: {
          DEFAULT: c("--destructive"),
          foreground: c("--destructive-foreground"),
        },
        border: c("--border"),
        input: c("--input"),
        ring: c("--ring"),
        // Mapsake brand tokens
        canvas: c("--canvas-bg"),
        surface: c("--surface"),
        "region-visited": c("--region-visited-fill"),
        "region-border": c("--region-border"),
        "text-primary": c("--text-primary"),
        "text-muted": c("--text-muted"),
        "terracotta-text": c("--terracotta-text"),
        "accent-glow": c("--accent-glow"),
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        // Mixed-script: Latin first, Noto TC fallback (per DESIGN.md)
        sans: [
          "var(--font-sans)",
          "var(--font-sans-tc)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        serif: [
          "var(--font-serif)",
          "var(--font-serif-tc)",
          "ui-serif",
          "Georgia",
          "serif",
        ],
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
