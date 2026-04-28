import type { NumericRangeValue, SearchFormState } from "../../form/types";
import { FILTERS } from "../../form/types";
import { translateMakeModelOtomotoToOlx, translate } from "./mapping";

const BASE = "https://www.olx.pl/motoryzacja/samochody/";

/**
 * Filters that olx supports through `search[<key>]=` query params. The
 * vocabulary mostly mirrors otomoto, but the keys are olx-shaped (notably:
 * `transmission` for gearbox, `petrol` for fuel, `milage` (sic) for mileage,
 * `enginesize` for engine capacity, `enginepower` for engine power, `drive`
 * for drivetrain).
 *
 * Filters not in this map are silently dropped — the `filter-compat`
 * resolver flags them so the user knows.
 */
const OLX_KEYS: Record<string, string> = {
  filter_enum_fuel_type: "petrol",
  filter_enum_gearbox: "transmission",
  filter_enum_transmission: "drive",
  filter_enum_body_type: "car_body",
  filter_enum_color: "color",
  filter_enum_country_origin: "country_origin",
};

/** Build the olx search URL from canonical otomoto-shaped form state. */
export function buildOlxUrl(state: SearchFormState): string {
  const params: string[] = [];

  // Make / model live in olx's URL *path*, not query params. The path supports
  // exactly one make and at most one model under that make:
  //   /motoryzacja/samochody/<make>/[<model>/]
  // The historical query-string form (`search[filter_enum_make][i]`) silently
  // returns zero results — olx ignores it. When the user picks multiple makes
  // we use the first one in the path; post-scrape filtering narrows further
  // (and the extras would have been dropped anyway since olx can't honor
  // them). A model is appended only when exactly one is selected AND it
  // belongs to the chosen make.
  let path = BASE;
  if (state.makes.length >= 1) {
    const chosenMake = state.makes[0]!;
    const olxMake = translateMakeModelOtomotoToOlx(chosenMake, null).make;
    path = `${BASE}${olxMake}/`;
    if (state.models.length === 1) {
      const modelsForMake = FILTERS.models[chosenMake] ?? [];
      if (modelsForMake.some((m) => m.id === state.models[0])) {
        const olxModel = translateMakeModelOtomotoToOlx(
          chosenMake,
          state.models[0]!,
        ).model;
        if (olxModel) path = `${path}${olxModel}/`;
      }
    }
  }

  pushRange(params, "filter_float_price", state.price);
  pushRange(params, "filter_float_year", state.year);
  pushRange(params, "filter_float_milage", state.mileage);
  pushRange(params, "filter_float_enginesize", state.engineCapacity);
  pushRange(params, "filter_float_enginepower", state.enginePower);

  for (const [otomotoId, values] of Object.entries(state.enums)) {
    if (!values.length) continue;
    const olxKey = OLX_KEYS[otomotoId];
    if (!olxKey) continue;
    const translated = values.map((v) => mapEnumValue(otomotoId, v));
    if (translated.length === 1) {
      pushSingle(params, `filter_enum_${olxKey}`, translated[0]!);
    } else {
      pushMulti(params, `filter_enum_${olxKey}`, translated);
    }
  }

  // "with photo" is hardcoded — olx-without-photos is just noise.
  pushSingle(params, "photos", "1");

  const qs = params.join("&");
  return qs.length ? `${path}?${qs}` : path;
}

function pushMulti(out: string[], id: string, values: string[]) {
  values.forEach((v, i) => {
    out.push(`search[${id}][${i}]=${encodeURIComponent(v)}`);
  });
}

function pushSingle(out: string[], id: string, value: string) {
  out.push(`search[${id}]=${encodeURIComponent(value)}`);
}

function pushRange(out: string[], id: string, range: NumericRangeValue) {
  if (range.from != null) out.push(`search[${id}:from]=${range.from}`);
  if (range.to != null) out.push(`search[${id}:to]=${range.to}`);
}

function mapEnumValue(otomotoId: string, value: string): string {
  switch (otomotoId) {
    case "filter_enum_fuel_type":
      return translate("fuel", "otomotoToOlx", value);
    case "filter_enum_gearbox":
      return translate("gearbox", "otomotoToOlx", value);
    case "filter_enum_transmission":
      return translate("drive", "otomotoToOlx", value);
    case "filter_enum_body_type":
      return translate("body", "otomotoToOlx", value);
    case "filter_enum_color":
      return translate("color", "otomotoToOlx", value);
    case "filter_enum_country_origin":
      return translate("countryOrigin", "otomotoToOlx", value);
    default:
      return value;
  }
}

/** olx pagination uses a `?page=N` query param. */
export function withOlxPage(searchUrl: string, page: number): string {
  const u = new URL(searchUrl);
  if (page <= 1) u.searchParams.delete("page");
  else u.searchParams.set("page", String(page));
  return u.toString();
}
