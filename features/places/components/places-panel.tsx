"use client";

import { useState } from "react";
import { List } from "lucide-react";
import { Drawer } from "vaul";
import type { Pin } from "@/data/pins";
import { usePins } from "@/features/pins/queries/pins-queries";
import { useRegionMarks } from "@/features/regions/queries/region-marks-queries";
import { buildPlaces } from "../lib/build-places";

/**
 * "Places visited" (去過的地方) — Story 4.7. The canonical keyboard/screen-reader path for
 * browsing and opening memories without the map (the map is a single focus stop). A quiet menu
 * button opens a modal drawer listing visited countries → admin-1 regions → pins. Activating a
 * pin opens its memory (and flies the map to it); a region that holds pins flies to one of them;
 * a bare region mark (no coordinate) just closes the list. Calm tone — no counts-as-score.
 */
export function PlacesPanel({
  onOpenPin,
  onFlyToPin,
}: {
  onOpenPin: (pinId: string) => void;
  onFlyToPin: (lat: number, lng: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const { data: pins } = usePins();
  const { data: marks } = useRegionMarks();
  const countries = buildPlaces(marks ?? [], pins ?? []);

  const openPin = (pin: Pin) => {
    onFlyToPin(pin.lat, pin.lng);
    onOpenPin(pin.id);
    setOpen(false);
  };
  // A region row: fly to one of its pins if it has any; either way close (bare marks have no coord).
  const selectRegion = (regionPins: Pin[]) => {
    if (regionPins[0]) onFlyToPin(regionPins[0].lat, regionPins[0].lng);
    setOpen(false);
  };

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Trigger asChild>
        <button
          type="button"
          aria-label="去過的地方"
          className="absolute left-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-card/95 text-foreground shadow-[0_2px_10px_rgba(58,46,34,0.18)]"
        >
          <List className="h-5 w-5" aria-hidden />
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-30 bg-[rgb(var(--map-frame))]/40" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 z-30 flex max-h-[85dvh] flex-col rounded-t-[18px] bg-card shadow-[0_-4px_16px_rgba(58,46,34,0.18)] outline-none"
        >
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-border" />
          <div className="flex flex-col gap-4 overflow-y-auto p-5">
            <Drawer.Title className="font-serif text-xl font-medium text-foreground">
              去過的地方
            </Drawer.Title>

            {countries.length === 0 ? (
              <p className="text-sm text-muted-foreground">輕觸地圖上你去過的地方，就會出現在這裡。</p>
            ) : (
              <ul className="flex flex-col gap-5">
                {countries.map((country) => (
                  <li key={country.countryCode} className="flex flex-col gap-2">
                    <h3 className="font-serif text-base font-medium text-foreground">{country.name}</h3>
                    <ul className="flex flex-col gap-1 pl-2">
                      {country.regions.map((region) => (
                        <li key={`${country.countryCode}-${region.regionCode}`} className="flex flex-col gap-1">
                          {region.name &&
                            (region.pins.length > 0 ? (
                              // Has pins → a control that flies the map to one of them.
                              <button
                                type="button"
                                onClick={() => selectRegion(region.pins)}
                                className="self-start py-1 text-left text-sm text-foreground hover:text-[rgb(var(--terracotta-text))]"
                              >
                                {region.name}
                              </button>
                            ) : (
                              // Bare visited region (no coordinate) → a calm label, not a dead button.
                              <span className="self-start py-1 text-sm text-muted-foreground">
                                {region.name}
                              </span>
                            ))}
                          {region.pins.length > 0 && (
                            <ul className="flex flex-col gap-0.5 pl-3">
                              {region.pins.map((pin) => (
                                <li key={pin.id}>
                                  <button
                                    type="button"
                                    onClick={() => openPin(pin)}
                                    className="self-start py-1 text-left text-sm text-[rgb(var(--terracotta-text))] hover:underline"
                                  >
                                    {pin.name}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
