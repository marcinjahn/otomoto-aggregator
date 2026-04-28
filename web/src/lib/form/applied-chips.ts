import {
  FILTERS,
  genKey,
  type NumericRangeValue,
  type SearchFormState,
} from "./types";

export interface AppliedChip {
  key: string;
  label: string;
  remove: (state: SearchFormState) => SearchFormState;
}

const intFmt = new Intl.NumberFormat("pl-PL");
const fmt = (n: number) => intFmt.format(n);

function rangeLabel(
  prefix: string,
  r: NumericRangeValue,
  unit: string,
): string {
  const u = unit ? ` ${unit}` : "";
  if (r.from != null && r.to != null) {
    return `${prefix}: ${fmt(r.from)} – ${fmt(r.to)}${u}`;
  }
  if (r.from != null) return `${prefix}: od ${fmt(r.from)}${u}`;
  if (r.to != null) return `${prefix}: do ${fmt(r.to)}${u}`;
  return prefix;
}

const ENUM_LABELS: Record<string, string> = {
  filter_enum_fuel_type: "Paliwo",
  filter_enum_gearbox: "Skrzynia",
  filter_enum_transmission: "Napęd",
  filter_enum_body_type: "Nadwozie",
  filter_enum_door_count: "Drzwi",
  filter_float_nr_seats: "Miejsca",
  filter_enum_color: "Kolor",
  filter_enum_colour_type: "Typ lakieru",
  filter_enum_upholstery_type: "Tapicerka",
  filter_enum_damaged: "Stan",
  filter_enum_country_origin: "Kraj",
  filter_enum_air_conditioning_type: "Klimatyzacja",
  filter_enum_sunroof: "Szyberdach",
  filter_enum_cruisecontrol_type: "Tempomat",
  filter_enum_headlight_lamp_type: "Reflektory",
  filter_string_battery_ownership_model: "Bateria",
};

function makeName(id: string): string {
  return FILTERS.makes.find((m) => m.id === id)?.name ?? id;
}
function modelName(makeId: string, modelId: string): string {
  return (
    (FILTERS.models[makeId] ?? []).find((m) => m.id === modelId)?.name ??
    modelId
  );
}
function generationName(genId: string): string {
  for (const list of Object.values(FILTERS.generations)) {
    const found = list.find((g) => g.id === genId);
    if (found) return found.name;
  }
  return genId;
}
function enumValueName(filterId: string, value: string): string {
  return (
    (FILTERS.enums[filterId] ?? []).find((e) => e.id === value)?.name ?? value
  );
}
function booleanName(id: string): string {
  return FILTERS.booleans.find((b) => b.id === id)?.name ?? id;
}

function findMakeForModel(
  makes: string[],
  modelId: string,
): string | undefined {
  return makes.find((mk) =>
    (FILTERS.models[mk] ?? []).some((x) => x.id === modelId),
  );
}

function removeMake(s: SearchFormState, id: string): SearchFormState {
  const makes = s.makes.filter((m) => m !== id);
  const models = s.models.filter((md) =>
    makes.some((mk) => (FILTERS.models[mk] ?? []).some((x) => x.id === md)),
  );
  const generations = s.generations.filter((g) =>
    makes.some((mk) =>
      models.some((md) =>
        (FILTERS.generations[genKey(mk, md)] ?? []).some((x) => x.id === g),
      ),
    ),
  );
  return { ...s, makes, models, generations };
}

function removeModel(s: SearchFormState, id: string): SearchFormState {
  const models = s.models.filter((m) => m !== id);
  const generations = s.generations.filter((g) =>
    s.makes.some((mk) =>
      models.some((md) =>
        (FILTERS.generations[genKey(mk, md)] ?? []).some((x) => x.id === g),
      ),
    ),
  );
  return { ...s, models, generations };
}

export function appliedFilterChips(state: SearchFormState): AppliedChip[] {
  const chips: AppliedChip[] = [];

  for (const id of state.makes) {
    chips.push({
      key: `make:${id}`,
      label: makeName(id),
      remove: (s) => removeMake(s, id),
    });
  }

  for (const md of state.models) {
    const mk = findMakeForModel(state.makes, md);
    const label =
      mk && state.makes.length > 1
        ? `${makeName(mk)} · ${modelName(mk, md)}`
        : mk
          ? modelName(mk, md)
          : md;
    chips.push({
      key: `model:${md}`,
      label,
      remove: (s) => removeModel(s, md),
    });
  }

  for (const g of state.generations) {
    chips.push({
      key: `gen:${g}`,
      label: `Generacja: ${generationName(g)}`,
      remove: (s) => ({
        ...s,
        generations: s.generations.filter((x) => x !== g),
      }),
    });
  }

  if (state.price.from != null || state.price.to != null) {
    chips.push({
      key: "price",
      label: rangeLabel("Cena", state.price, "zł"),
      remove: (s) => ({ ...s, price: { from: null, to: null } }),
    });
  }
  if (state.year.from != null || state.year.to != null) {
    chips.push({
      key: "year",
      label: rangeLabel("Rok", state.year, ""),
      remove: (s) => ({ ...s, year: { from: null, to: null } }),
    });
  }
  if (state.mileage.from != null || state.mileage.to != null) {
    chips.push({
      key: "mileage",
      label: rangeLabel("Przebieg", state.mileage, "km"),
      remove: (s) => ({ ...s, mileage: { from: null, to: null } }),
    });
  }
  if (state.engineCapacity.from != null || state.engineCapacity.to != null) {
    chips.push({
      key: "engineCapacity",
      label: rangeLabel("Pojemność", state.engineCapacity, "cm³"),
      remove: (s) => ({ ...s, engineCapacity: { from: null, to: null } }),
    });
  }
  if (state.enginePower.from != null || state.enginePower.to != null) {
    chips.push({
      key: "enginePower",
      label: rangeLabel("Moc", state.enginePower, "KM"),
      remove: (s) => ({ ...s, enginePower: { from: null, to: null } }),
    });
  }

  for (const [filterId, values] of Object.entries(state.enums)) {
    const cat = ENUM_LABELS[filterId] ?? filterId;
    for (const v of values) {
      chips.push({
        key: `enum:${filterId}:${v}`,
        label: `${cat}: ${enumValueName(filterId, v)}`,
        remove: (s) => ({
          ...s,
          enums: {
            ...s.enums,
            [filterId]: (s.enums[filterId] ?? []).filter((x) => x !== v),
          },
        }),
      });
    }
  }

  for (const [id, enabled] of Object.entries(state.booleans)) {
    if (!enabled) continue;
    chips.push({
      key: `bool:${id}`,
      label: booleanName(id),
      remove: (s) => ({ ...s, booleans: { ...s.booleans, [id]: false } }),
    });
  }

  if (state.newUsed) {
    const v = state.newUsed;
    chips.push({
      key: "newUsed",
      label: v === "new" ? "Nowy" : "Używany",
      remove: (s) => ({ ...s, newUsed: null }),
    });
  }
  if (state.privateBusiness) {
    const v = state.privateBusiness;
    chips.push({
      key: "privateBusiness",
      label: v === "private" ? "Prywatny" : "Firma",
      remove: (s) => ({ ...s, privateBusiness: null }),
    });
  }

  return chips;
}
