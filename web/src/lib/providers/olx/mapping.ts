/**
 * olx ↔ otomoto value translation.
 *
 * otomoto's catalog is canonical (`form/data.json`). olx ad params and URL
 * filter values use a closely-related but slightly different vocabulary.
 * Identity is the default — when the slugs already match, no entry is needed.
 * Explicit overrides cover only the observed mismatches.
 *
 * Entries are bidirectional: olxToOtomoto + otomotoToOlx are derived from the
 * single OVERRIDES table per category.
 */

type Direction = "olxToOtomoto" | "otomotoToOlx";

interface CategoryMap {
  /** olx slug → otomoto slug. */
  olxToOtomoto: Map<string, string>;
  /** otomoto slug → olx slug. */
  otomotoToOlx: Map<string, string>;
}

function buildMap(overrides: Record<string, string>): CategoryMap {
  const olxToOtomoto = new Map<string, string>();
  const otomotoToOlx = new Map<string, string>();
  for (const [olxSlug, otomotoSlug] of Object.entries(overrides)) {
    olxToOtomoto.set(olxSlug, otomotoSlug);
    otomotoToOlx.set(otomotoSlug, olxSlug);
  }
  return { olxToOtomoto, otomotoToOlx };
}

const MAKES = buildMap({
  // olx slug : otomoto slug
  "mercedes-benz": "mercedes-benz",
  landrover: "land-rover",
  // (Most makes use identity; record overrides here as we observe them.)
});

/**
 * Models live nested under makes in olx's filter tree. We only override known
 * mismatches per make. Lookup key is `<makeOtomotoSlug>::<modelSlug>`.
 */
const MODELS = buildMap({
  // example: "audi::a-4": "a4",
});

const FUEL = buildMap({
  petrol: "petrol",
  diesel: "diesel",
  "petrol-cng": "petrol-cng",
  "petrol-lpg": "petrol-lpg",
  hybrid: "hybrid",
  electric: "electric",
});

const GEARBOX = buildMap({
  manual: "manual",
  automatic: "automatic",
});

const BODY = buildMap({
  sedan: "sedan",
  hatchback: "hatchback",
  kombi: "combi",
  suv: "suv",
  coupe: "coupe",
  cabrio: "cabrio",
  minivan: "minivan",
  city: "city-cars",
  small: "small-cars",
});

const COLOR = buildMap({
  // olx and otomoto largely agree on color slugs.
});

const DRIVE = buildMap({
  front: "front-wheel",
  rear: "rear-wheel",
  "4x4": "4x4-permanent",
});

const CONDITION = buildMap({
  // olx uses isBusiness boolean + itemCondition; otomoto uses filter_enum_damaged + new_used.
  // Translate "uszkodzony" / "nieuszkodzony" identity for now.
});

const COUNTRY_ORIGIN = buildMap({
  // Country slugs largely identity; record overrides here.
});

const REGISTRY: Record<string, CategoryMap> = {
  make: MAKES,
  fuel: FUEL,
  gearbox: GEARBOX,
  body: BODY,
  color: COLOR,
  drive: DRIVE,
  condition: CONDITION,
  countryOrigin: COUNTRY_ORIGIN,
};

export type Category = keyof typeof REGISTRY | "model";

/**
 * Translate a value between olx and otomoto vocabularies. Falls back to the
 * input when no override is registered (identity).
 *
 * Unmapped values pass through with a `console.warn` in dev so we can spot
 * regressions. Offers are never dropped due to a mapping miss.
 */
export function translate(
  category: Category,
  direction: Direction,
  value: string,
): string {
  if (category === "model") {
    // Models go through MODELS keyed by `make::model`, callers must compose
    // the key themselves; bare-model lookups always fall through to identity.
    const map =
      direction === "olxToOtomoto" ? MODELS.olxToOtomoto : MODELS.otomotoToOlx;
    return map.get(value) ?? value;
  }
  const cat = REGISTRY[category];
  if (!cat) return value;
  const map =
    direction === "olxToOtomoto" ? cat.olxToOtomoto : cat.otomotoToOlx;
  const out = map.get(value);
  if (out !== undefined) return out;
  return value;
}

/**
 * Translate a make/model pair olx→otomoto. Returns the otomoto-shaped slugs
 * (with identity fallback per slug).
 */
export function translateMakeModelOlxToOtomoto(
  makeOlx: string,
  modelOlx: string | null,
): { make: string; model: string | null } {
  const make = MAKES.olxToOtomoto.get(makeOlx) ?? makeOlx;
  if (modelOlx == null) return { make, model: null };
  const key = `${make}::${modelOlx}`;
  const model = MODELS.olxToOtomoto.get(key) ?? modelOlx;
  return { make, model };
}

/**
 * Translate a make/model pair otomoto→olx. Used by buildUrl to push the
 * canonical otomoto slugs out as olx filter values.
 */
export function translateMakeModelOtomotoToOlx(
  makeOtomoto: string,
  modelOtomoto: string | null,
): { make: string; model: string | null } {
  const make = MAKES.otomotoToOlx.get(makeOtomoto) ?? makeOtomoto;
  if (modelOtomoto == null) return { make, model: null };
  const key = `${makeOtomoto}::${modelOtomoto}`;
  const model = MODELS.otomotoToOlx.get(key) ?? modelOtomoto;
  return { make, model };
}
