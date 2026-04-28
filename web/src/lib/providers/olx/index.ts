import type { SearchFormState } from "../../form/types";
import type { Provider, ProviderScrapeOptions } from "../types";
import { buildOlxUrl } from "./build-url";
import { scrapeOlx } from "./scrape";

const SUPPORTED: ReadonlySet<string> = new Set([
  "makes",
  "models",
  "price",
  "year",
  "mileage",
  "engineCapacity",
  "enginePower",
  "filter_enum_fuel_type",
  "filter_enum_gearbox",
  "filter_enum_transmission",
  "filter_enum_body_type",
  "filter_enum_color",
  "filter_enum_country_origin",
]);

const UNSUPPORTED: ReadonlySet<string> = new Set([
  "generations",
  "newUsed",
  "privateBusiness",
  "filter_enum_door_count",
  "filter_float_nr_seats",
  "filter_enum_colour_type",
  "filter_enum_upholstery_type",
  "filter_enum_damaged",
  "filter_enum_air_conditioning_type",
  "filter_enum_sunroof",
  "filter_enum_cruisecontrol_type",
  "filter_enum_headlight_lamp_type",
  "filter_string_battery_ownership_model",
  "booleans",
]);

export const olxProvider: Provider = {
  id: "olx",
  label: "olx.pl",
  badgeText: "olx",
  supportedFilters: SUPPORTED,
  unsupportedFilters: UNSUPPORTED,
  buildUrl(form: SearchFormState): string {
    return buildOlxUrl(form);
  },
  scrape(url: string, opts: ProviderScrapeOptions) {
    return scrapeOlx(url, {
      proxyUrl: opts.proxyUrl,
      signal: opts.signal,
      droppedFilters: opts.droppedFilters,
      onProgress: opts.onProgress,
      onBatch: opts.onBatch,
    });
  },
  resultsPageUrl(form: SearchFormState): string {
    return buildOlxUrl(form);
  },
};

export { buildOlxUrl } from "./build-url";
