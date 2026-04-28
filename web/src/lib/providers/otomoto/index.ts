import type { SearchFormState } from "../../form/types";
import type {
  Provider,
  ProviderEnrichOptions,
  ProviderScrapeOptions,
} from "../types";
import { buildOtomotoUrl, parseOtomotoUrl } from "./build-url";
import { enrichAll } from "./enrich";
import { scrape } from "./scrape";

const SUPPORTED: ReadonlySet<string> = new Set([
  "makes",
  "models",
  "generations",
  "price",
  "year",
  "mileage",
  "engineCapacity",
  "enginePower",
  "newUsed",
  "privateBusiness",
  // All otomoto enums and booleans accepted by buildOtomotoUrl pass through.
  "filter_enum_fuel_type",
  "filter_enum_gearbox",
  "filter_enum_transmission",
  "filter_enum_body_type",
  "filter_enum_door_count",
  "filter_float_nr_seats",
  "filter_enum_color",
  "filter_enum_colour_type",
  "filter_enum_upholstery_type",
  "filter_enum_damaged",
  "filter_enum_country_origin",
  "filter_enum_air_conditioning_type",
  "filter_enum_sunroof",
  "filter_enum_cruisecontrol_type",
  "filter_enum_headlight_lamp_type",
  "filter_string_battery_ownership_model",
  "booleans",
]);

export const otomotoProvider: Provider = {
  id: "otomoto",
  label: "otomoto.pl",
  badgeText: "otomoto",
  supportedFilters: SUPPORTED,
  unsupportedFilters: new Set(),
  buildUrl(form: SearchFormState): string {
    return buildOtomotoUrl(form);
  },
  parseUrl(raw: string): SearchFormState {
    return parseOtomotoUrl(raw);
  },
  scrape(url: string, opts: ProviderScrapeOptions) {
    return scrape(url, {
      proxyUrl: opts.proxyUrl,
      signal: opts.signal,
      onProgress: opts.onProgress,
      onBatch: opts.onBatch,
    });
  },
  enrich(offers, opts: ProviderEnrichOptions) {
    return enrichAll(offers, {
      proxyUrl: opts.proxyUrl,
      signal: opts.signal,
      onProgress: opts.onProgress,
      onOffer: (id, fields) => opts.onOffer?.(id, fields),
    });
  },
  resultsPageUrl(form: SearchFormState): string {
    return buildOtomotoUrl(form);
  },
};

export { buildOtomotoUrl, parseOtomotoUrl } from "./build-url";
