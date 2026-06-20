import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

// Mapsake — light-only v1. Tokens are direct CSS values (see app/globals.css).
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
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        // Mapsake brand tokens
        canvas: "var(--canvas-bg)",
        surface: "var(--surface)",
        "region-visited": "var(--region-visited-fill)",
        "region-border": "var(--region-border)",
        "text-primary": "var(--text-primary)",
        "text-muted": "var(--text-muted)",
        "terracotta-text": "var(--terracotta-text)",
        "accent-glow": "var(--accent-glow)",
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
