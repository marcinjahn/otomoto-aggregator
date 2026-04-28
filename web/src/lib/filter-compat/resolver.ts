import type { SearchFormState } from "../form/types";
import { FILTERS } from "../form/types";
import type { Provider } from "../providers/types";

export interface DroppedFilter {
  id: string;
  /** Polish label for the filter section (e.g. "Generacja", "Tapicerka"). */
  label: string;
}

export interface ResolvedFilters {
  /** Filters that the provider's URL will honor. */
  urlFilters: SearchFormState;
  /** Filters dropped from the URL because the provider can't honor them. */
  dropped: DroppedFilter[];
}

/**
 * Polish labels for the form-state filter ids. Used for the dropped-filter
 * banner ("olx.pl ignoruje filtry: Generacja, Tapicerka, …") and the
 * per-offer "warunki niepełne" pill.
 */
const LABELS: Record<string, string> = {
  generations: "Generacja",
  newUsed: "Stan (nowy/używany)",
  privateBusiness: "Sprzedawca",
  filter_enum_door_count: "Liczba drzwi",
  filter_float_nr_seats: "Liczba miejsc",
  filter_enum_colour_type: "Typ lakieru",
  filter_enum_upholstery_type: "Tapicerka",
  filter_enum_damaged: "Stan",
  filter_enum_air_conditioning_type: "Klimatyzacja",
  filter_enum_sunroof: "Szyberdach",
  filter_enum_cruisecontrol_type: "Tempomat",
  filter_enum_headlight_lamp_type: "Reflektory",
  filter_string_battery_ownership_model: "Bateria (EV)",
  booleans: "Wyposażenie",
};

/**
 * Pure resolver. Given a form state and a provider, returns:
 *   - `urlFilters`: a stripped-down state safe to feed to provider.buildUrl
 *   - `dropped`: the filters the user set that the provider can't honor
 *
 * This is the single source of truth for: what URL the provider builds, what
 * the user sees in the warning banner, and what the per-offer pill displays.
 */
export function resolveFilters(
  form: SearchFormState,
  provider: Provider,
): ResolvedFilters {
  const dropped: DroppedFilter[] = [];
  const out: SearchFormState = {
    makes: form.makes,
    models: form.models,
    generations: provider.supportedFilters.has("generations")
      ? form.generations
      : [],
    price: form.price,
    year: form.year,
    mileage: form.mileage,
    engineCapacity: form.engineCapacity,
    enginePower: form.enginePower,
    enums: {},
    booleans: {},
    newUsed: provider.supportedFilters.has("newUsed") ? form.newUsed : null,
    privateBusiness: provider.supportedFilters.has("privateBusiness")
      ? form.privateBusiness
      : null,
  };

  if (
    form.generations.length &&
    !provider.supportedFilters.has("generations")
  ) {
    dropped.push({ id: "generations", label: LABELS.generations! });
  }
  if (form.newUsed && !provider.supportedFilters.has("newUsed")) {
    dropped.push({ id: "newUsed", label: LABELS.newUsed! });
  }
  if (
    form.privateBusiness &&
    !provider.supportedFilters.has("privateBusiness")
  ) {
    dropped.push({ id: "privateBusiness", label: LABELS.privateBusiness! });
  }

  for (const [id, values] of Object.entries(form.enums)) {
    if (!values.length) continue;
    if (provider.supportedFilters.has(id)) {
      out.enums[id] = values;
    } else {
      dropped.push({ id, label: LABELS[id] ?? id });
    }
  }

  let anyBooleanDropped = false;
  for (const [id, enabled] of Object.entries(form.booleans)) {
    if (!enabled) continue;
    if (
      provider.supportedFilters.has(id) ||
      provider.supportedFilters.has("booleans")
    ) {
      out.booleans[id] = true;
    } else {
      anyBooleanDropped = true;
    }
  }
  if (anyBooleanDropped) {
    // Collapse the equipment grid into one entry — listing every checkbox is
    // noisy. The user can re-open the form to see what they had on.
    if (!dropped.some((d) => d.id === "booleans")) {
      dropped.push({ id: "booleans", label: LABELS.booleans! });
    }
  }

  return { urlFilters: out, dropped };
}

/** Get the Polish label for a filter id, e.g. for the "tylko OTO" hints. */
export function filterLabel(id: string): string {
  return LABELS[id] ?? FILTERS.groups[id]?.name ?? id;
}
