export type ModelKey = string;
export type GenerationKey = string;

export interface NumericRange {
  lowInclusive: number;
  highExclusive: number;
}

export interface FilterState {
  /** Whole-model selections; matches every offer under this make/model including offers with no generation data. */
  models: Set<ModelKey>;
  /** Specific generation selections; matches offers whose generationCode (plus make/model) equals the key. */
  generations: Set<GenerationKey>;
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
    generations: new Set(),
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
    f.generations.size > 0 ||
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

export function generationKey(
  make: string,
  model: string,
  generationCode: string,
): GenerationKey {
  return `${make}__${model}__${generationCode}`;
}

export const NO_GEN_CODE = "__nogen__";
