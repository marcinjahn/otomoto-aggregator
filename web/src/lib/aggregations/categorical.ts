import type { Offer } from "../scraper/types";
import type { Aggregator, CategoricalResult } from "./types";

function makeCategorical(
  id: string,
  title: string,
  description: string,
  pick: (o: Offer) => { key: string; display: string } | null,
): Aggregator<CategoricalResult> {
  return {
    id,
    title,
    description,
    compute(offers: Offer[]): CategoricalResult {
      const counts = new Map<string, { display: string; count: number }>();
      let missing = 0;
      for (const o of offers) {
        const v = pick(o);
        if (!v) {
          missing++;
          continue;
        }
        const existing = counts.get(v.key);
        if (existing) existing.count++;
        else counts.set(v.key, { display: v.display, count: 1 });
      }
      const totalCounted = offers.length - missing;
      const buckets = [...counts.entries()]
        .map(([key, { display, count }]) => ({
          key,
          display,
          count,
          share: totalCounted > 0 ? count / totalCounted : 0,
        }))
        .sort((a, b) => b.count - a.count);
      return { buckets, totalCounted, totalMissing: missing };
    },
  };
}

export const byFuelType = makeCategorical(
  "by-fuel",
  "By fuel type",
  "Distribution of offers across fuel types.",
  (o) =>
    o.fuelType && o.fuelTypeDisplay
      ? { key: o.fuelType, display: o.fuelTypeDisplay }
      : null,
);

export const byGearbox = makeCategorical(
  "by-gearbox",
  "By gearbox",
  "Distribution of offers across gearbox types.",
  (o) =>
    o.gearbox && o.gearboxDisplay
      ? { key: o.gearbox, display: o.gearboxDisplay }
      : null,
);

export const byRegion = makeCategorical(
  "by-region",
  "By region",
  "Where the cars are located (by region/voivodeship).",
  (o) => (o.region ? { key: o.region, display: o.region } : null),
);

export const byMake = makeCategorical(
  "by-make",
  "By make",
  "Top car makes in this search.",
  (o) =>
    o.make && o.makeDisplay ? { key: o.make, display: o.makeDisplay } : null,
);
