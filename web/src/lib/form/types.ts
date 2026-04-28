import data from "./data.json";

export interface IdName {
  id: string;
  name: string;
}

export interface MakeEntry extends IdName {
  counter: number;
}

export interface RangeData {
  min: number;
  max: number;
  suggestions: number[];
}

export interface BooleanFilter {
  id: string;
  name: string;
  parent: string | null;
}

export interface GroupMeta {
  name: string;
  description: string | null;
}

export interface FilterData {
  makes: MakeEntry[];
  models: Record<string, IdName[]>;
  generations: Record<string, IdName[]>;
  enums: Record<string, IdName[]>;
  ranges: Record<string, RangeData>;
  booleans: BooleanFilter[];
  groups: Record<string, GroupMeta>;
}

export const FILTERS: FilterData = data as FilterData;

export interface NumericRangeValue {
  from: number | null;
  to: number | null;
}

export interface SearchFormState {
  makes: string[];
  models: string[];
  generations: string[];
  price: NumericRangeValue;
  year: NumericRangeValue;
  mileage: NumericRangeValue;
  engineCapacity: NumericRangeValue;
  enginePower: NumericRangeValue;
  enums: Record<string, string[]>;
  booleans: Record<string, boolean>;
  newUsed: "new" | "used" | null;
  privateBusiness: "private" | "business" | null;
}

export function emptyForm(): SearchFormState {
  return {
    makes: [],
    models: [],
    generations: [],
    price: { from: null, to: null },
    year: { from: null, to: null },
    mileage: { from: null, to: null },
    engineCapacity: { from: null, to: null },
    enginePower: { from: null, to: null },
    enums: {},
    booleans: {},
    newUsed: null,
    privateBusiness: null,
  };
}

export function genKey(make: string, model: string): string {
  return `${make}|${model}`;
}
