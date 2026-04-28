import { getProvider } from "../providers/registry";
import type { Offer } from "../scraper/types";
import type { Aggregator, CategoricalResult } from "./types";

/**
 * Source aggregation. Mirrors `categorical.ts` but keyed off `o.source`.
 * Display name is the provider's human label (e.g. "otomoto.pl").
 */
export const bySource: Aggregator<CategoricalResult> = {
  id: "by-source",
  title: "Źródło",
  description: "Rozkład ofert według źródła (otomoto / olx).",
  compute(offers: Offer[]): CategoricalResult {
    const counts = new Map<string, { display: string; count: number }>();
    for (const o of offers) {
      const existing = counts.get(o.source);
      if (existing) existing.count++;
      else
        counts.set(o.source, {
          display: getProvider(o.source).label,
          count: 1,
        });
    }
    const totalCounted = offers.length;
    const buckets = [...counts.entries()]
      .map(([key, { display, count }]) => ({
        key,
        display,
        count,
        share: totalCounted > 0 ? count / totalCounted : 0,
      }))
      .sort((a, b) => b.count - a.count);
    return { buckets, totalCounted, totalMissing: 0 };
  },
};
