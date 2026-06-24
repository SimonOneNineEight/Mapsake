import type { MetadataRoute } from "next";

// PWA manifest (Story 4.5). Colors are the DESIGN parchment/terracotta tokens as literal hex
// (a manifest can't read CSS variables). Icons are Simon-supplied brand PNGs in public/icons.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mapsake",
    short_name: "Mapsake",
    description: "A private travel keepsake — the map you keep, for the sake of memory.",
    lang: "zh-Hant",
    start_url: "/",
    display: "standalone",
    background_color: "#F2E8D5", // parchment canvas
    theme_color: "#F2E8D5",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
