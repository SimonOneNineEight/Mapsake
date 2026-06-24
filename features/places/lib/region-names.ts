import names from "../region-names.json";

// Code → zh-Hant region name (Story 4.7). Region marks store only ISO codes (country `JP`,
// admin-1 `JP-26`); names are baked into the tiles (in-view only), so the "Places visited" list
// uses this bundled gazetteer (built from Wikidata, same source as the tile labels). Bundled (not
// fetched) so the list also works offline. Falls back to the raw code if a name is missing.
const MAP = names as Record<string, string>;

export function regionName(code: string): string {
  return MAP[code] ?? code;
}
