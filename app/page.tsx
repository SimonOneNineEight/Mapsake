import { MapCanvas } from "@/features/map/components/MapCanvas";

// The map is the home surface (Story 1.3). Pins, visited fill, and onboarding
// arrive in later stories.
export default function Home() {
  return (
    // Desktop gets a small keepsake inset (a parchment mat + shadow); phones stay
    // full-bleed so every pixel of map counts.
    <main className="h-dvh w-full overflow-hidden bg-[rgb(var(--map-frame))] md:p-3.5">
      <MapCanvas />
    </main>
  );
}
