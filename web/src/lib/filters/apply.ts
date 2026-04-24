import type { Offer } from "../scraper/types";
import type { FilterState, NumericRange } from "./types";
import { modelKey } from "./types";

function inAnyRange(v: number | null, ranges: NumericRange[]): boolean {
  if (ranges.length === 0) return true;
  if (v == null) return false;
  for (const r of ranges) {
    if (v >= r.lowInclusive && v < r.highExclusive) return true;
  }
  return false;
}

function inSet(value: string | null | undefined, set: Set<string>): boolean {
  if (set.size === 0) return true;
  if (value == null) return false;
  return set.has(value);
}

export function applyFilters(
  offers: readonly Offer[],
  f: FilterState,
): Offer[] {
  const out: Offer[] = [];
  for (const o of offers) {
    if (f.models.size > 0) {
      if (!o.make || !o.model) continue;
      if (!f.models.has(modelKey(o.make, o.model))) continue;
    }
    if (!inSet(o.make, f.makes)) continue;
    if (!inSet(o.fuelType, f.fuelTypes)) continue;
    if (!inSet(o.gearbox, f.gearboxes)) continue;
    if (!inSet(o.region, f.regions)) continue;
    if (!inAnyRange(o.priceAmount, f.priceRanges)) continue;
    if (!inAnyRange(o.year, f.yearRanges)) continue;
    if (!inAnyRange(o.mileageKm, f.mileageRanges)) continue;
    out.push(o);
  }
  return out;
}

export function rangesEqual(a: NumericRange, b: NumericRange): boolean {
  return (
    a.lowInclusive === b.lowInclusive && a.highExclusive === b.highExclusive
  );
}

export function toggleRange(
  list: NumericRange[],
  r: NumericRange,
): NumericRange[] {
  const idx = list.findIndex((x) => rangesEqual(x, r));
  if (idx >= 0) return list.filter((_, i) => i !== idx);
  return [...list, r];
}

export function toggleSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
