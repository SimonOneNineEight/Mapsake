import { MapMemoryShell } from "@/features/memories/components/map-memory-shell";

// The map + memory panel/sheet are the home surface (Story 1.3 map, Story 3.4 memory).
export default function Home() {
  return (
    // Desktop gets a small keepsake inset (a parchment mat + shadow); phones stay
    // full-bleed so every pixel of map counts.
    <main className="h-dvh w-full overflow-hidden bg-[rgb(var(--map-frame))] md:p-3.5">
      <MapMemoryShell />
    </main>
  );
}
