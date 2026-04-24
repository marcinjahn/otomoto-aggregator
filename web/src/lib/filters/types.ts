export type ModelKey = string;

export interface NumericRange {
  lowInclusive: number;
  highExclusive: number;
}

export interface FilterState {
  models: Set<ModelKey>;
  makes: Set<string>;
  fuelTypes: Set<string>;
  gearboxes: Set<string>;
  regions: Set<string>;
  priceRanges: NumericRange[];
  yearRanges: NumericRange[];
  mileageRanges: NumericRange[];
}

export function emptyFilters(): FilterState {
  return {
    models: new Set(),
    makes: new Set(),
    fuelTypes: new Set(),
    gearboxes: new Set(),
    regions: new Set(),
    priceRanges: [],
    yearRanges: [],
    mileageRanges: [],
  };
}

export function hasAnyFilter(f: FilterState): boolean {
  return (
    f.models.size > 0 ||
    f.makes.size > 0 ||
    f.fuelTypes.size > 0 ||
    f.gearboxes.size > 0 ||
    f.regions.size > 0 ||
    f.priceRanges.length > 0 ||
    f.yearRanges.length > 0 ||
    f.mileageRanges.length > 0
  );
}

export function modelKey(make: string, model: string): ModelKey {
  return `${make}__${model}`;
}
