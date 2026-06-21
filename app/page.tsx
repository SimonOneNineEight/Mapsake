import { MapCanvas } from "@/features/map/components/MapCanvas";

// The map is the home surface (Story 1.3). Pins, visited fill, and onboarding
// arrive in later stories.
export default function Home() {
  return (
    <main className="h-dvh w-full overflow-hidden">
      <MapCanvas />
    </main>
  );
}
