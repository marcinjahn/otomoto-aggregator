import type { NumericRangeValue, SearchFormState } from "./types";

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

  // Always-on defaults: undamaged cars, no accident history.
  pushSingle("filter_enum_damaged", "0");
  pushSingle("filter_enum_no_accident", "1");

  if (state.sort && state.sort !== "relevance_web") {
    pushSingle("order", state.sort);
  }

  const qs = params.join("&");
  return qs.length ? `${BASE}?${qs}` : BASE;
}
