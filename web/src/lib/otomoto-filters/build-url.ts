import {
  FILTERS,
  emptyForm,
  type NumericRangeValue,
  type SearchFormState,
} from "./types";

const BASE = "https://www.otomoto.pl/osobowe";

export function buildOtomotoUrl(state: SearchFormState): string {
  const params: string[] = [];

  const pushMulti = (id: string, values: string[]) => {
    values.forEach((v, i) => {
      params.push(`search[${id}][${i}]=${encodeURIComponent(v)}`);
    });
  };
  const pushSingle = (id: string, value: string) => {
    params.push(`search[${id}]=${encodeURIComponent(value)}`);
  };
  const pushRange = (id: string, range: NumericRangeValue) => {
    if (range.from != null) {
      params.push(`search[${id}:from]=${range.from}`);
    }
    if (range.to != null) {
      params.push(`search[${id}:to]=${range.to}`);
    }
  };

  if (state.makes.length) pushMulti("filter_enum_make", state.makes);
  if (state.models.length) pushMulti("filter_enum_model", state.models);
  if (state.generations.length)
    pushMulti("filter_enum_generation", state.generations);

  pushRange("filter_float_price", state.price);
  pushRange("filter_float_year", state.year);
  pushRange("filter_float_mileage", state.mileage);
  pushRange("filter_float_engine_capacity", state.engineCapacity);
  pushRange("filter_float_engine_power", state.enginePower);

  for (const [id, values] of Object.entries(state.enums)) {
    if (!values.length) continue;
    if (values.length === 1) pushSingle(id, values[0]!);
    else pushMulti(id, values);
  }

  for (const [id, enabled] of Object.entries(state.booleans)) {
    if (enabled) pushSingle(id, "1");
  }

  if (state.newUsed) pushSingle("new_used", state.newUsed);
  if (state.privateBusiness)
    pushSingle("private_business", state.privateBusiness);

  const qs = params.join("&");
  return qs.length ? `${BASE}?${qs}` : BASE;
}

const BOOLEAN_IDS = new Set(FILTERS.booleans.map((b) => b.id));
const ENUM_IDS = new Set(Object.keys(FILTERS.enums));
const RANGE_IDS = new Set(Object.keys(FILTERS.ranges));
const RANGE_STATE_KEYS: Record<string, keyof SearchFormState> = {
  filter_float_price: "price",
  filter_float_year: "year",
  filter_float_mileage: "mileage",
  filter_float_engine_capacity: "engineCapacity",
  filter_float_engine_power: "enginePower",
};

/**
 * Inverse of buildOtomotoUrl: extracts a SearchFormState from an otomoto URL's
 * `search[...]` query params. Unknown keys are ignored.
 */
export function parseOtomotoUrl(raw: string): SearchFormState {
  const state = emptyForm();
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return state;
  }

  for (const [key, value] of u.searchParams) {
    const m = /^search\[([^\]]+)\](?:\[(\d+)\])?$/.exec(key);
    if (!m) continue;
    const rawId = m[1]!;

    const rangeMatch = /^(.+):(from|to)$/.exec(rawId);
    if (rangeMatch) {
      const id = rangeMatch[1]!;
      const side = rangeMatch[2] as "from" | "to";
      const stateKey = RANGE_STATE_KEYS[id];
      if (!stateKey) continue;
      const num = Number(value);
      if (!Number.isFinite(num)) continue;
      (state[stateKey] as NumericRangeValue)[side] = num;
      continue;
    }

    if (rawId === "filter_enum_make") {
      if (!state.makes.includes(value)) state.makes.push(value);
      continue;
    }
    if (rawId === "filter_enum_model") {
      if (!state.models.includes(value)) state.models.push(value);
      continue;
    }
    if (rawId === "filter_enum_generation") {
      if (!state.generations.includes(value)) state.generations.push(value);
      continue;
    }
    if (rawId === "new_used") {
      if (value === "new" || value === "used") state.newUsed = value;
      continue;
    }
    if (rawId === "private_business") {
      if (value === "private" || value === "business")
        state.privateBusiness = value;
      continue;
    }
    if (BOOLEAN_IDS.has(rawId)) {
      state.booleans[rawId] = value === "1" || value === "true";
      continue;
    }
    if (ENUM_IDS.has(rawId)) {
      const arr = state.enums[rawId] ?? [];
      if (!arr.includes(value)) arr.push(value);
      state.enums[rawId] = arr;
      continue;
    }
    // Fallback: if a range id sneaks in without :from/:to, ignore.
    if (RANGE_IDS.has(rawId)) continue;
  }

  return state;
}
