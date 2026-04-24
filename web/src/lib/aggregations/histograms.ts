import type { Offer } from "../scraper/types";
import type {
  Aggregator,
  HistogramBucket,
  HistogramResult,
  PriceOverallResult,
} from "./types";
import { mean, median, minMax } from "./stats";

function formatK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

function makeHistogram(
  id: string,
  title: string,
  description: string,
  pick: (o: Offer) => number | null,
  options: {
    bucketWidth?: number;
    targetBuckets?: number;
    label: (low: number, high: number) => string;
  },
): Aggregator<HistogramResult> {
  return {
    id,
    title,
    description,
    compute(offers: Offer[]): HistogramResult {
      const values: number[] = [];
      let missing = 0;
      for (const o of offers) {
        const v = pick(o);
        if (v == null || !Number.isFinite(v)) {
          missing++;
          continue;
        }
        values.push(v);
      }
      const mm = minMax(values);
      if (!mm || values.length === 0) {
        return {
          buckets: [],
          totalCounted: 0,
          totalMissing: missing,
          min: null,
          max: null,
          median: null,
          mean: null,
        };
      }

      let width = options.bucketWidth;
      if (!width) {
        const target = options.targetBuckets ?? 12;
        const span = Math.max(1, mm.max - mm.min);
        width = niceBucketWidth(span / target);
      }

      const start = Math.floor(mm.min / width) * width;
      const end = Math.floor(mm.max / width) * width + width;
      const bucketCount = Math.max(1, Math.round((end - start) / width));
      const buckets: HistogramBucket[] = [];
      for (let i = 0; i < bucketCount; i++) {
        const low = start + i * width;
        const high = low + width;
        buckets.push({
          lowInclusive: low,
          highExclusive: high,
          count: 0,
          label: options.label(low, high),
        });
      }
      for (const v of values) {
        let idx = Math.floor((v - start) / width);
        if (idx >= bucketCount) idx = bucketCount - 1;
        if (idx < 0) idx = 0;
        buckets[idx]!.count++;
      }

      const sorted = [...values].sort((a, b) => a - b);
      return {
        buckets,
        totalCounted: values.length,
        totalMissing: missing,
        min: mm.min,
        max: mm.max,
        median: median(sorted),
        mean: mean(values),
      };
    },
  };
}

function niceBucketWidth(rough: number): number {
  if (rough <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(rough)));
  const norm = rough / mag;
  let nice: number;
  if (norm <= 1) nice = 1;
  else if (norm <= 2) nice = 2;
  else if (norm <= 2.5) nice = 2.5;
  else if (norm <= 5) nice = 5;
  else nice = 10;
  return nice * mag;
}

export const priceHistogram = makeHistogram(
  "hist-price",
  "Rozkład cen",
  "Rozkład ofert względem przedziałów cenowych (PLN).",
  (o) => o.priceAmount,
  { targetBuckets: 12, label: (lo, hi) => `${formatK(lo)}–${formatK(hi)}` },
);

export const yearHistogram = makeHistogram(
  "hist-year",
  "Rozkład rocznika",
  "Liczba ofert wg rocznika.",
  (o) => o.year,
  { bucketWidth: 1, label: (lo) => `${lo}` },
);

export const mileageHistogram = makeHistogram(
  "hist-mileage",
  "Rozkład przebiegu",
  "Rozkład ofert względem przedziałów przebiegu (km).",
  (o) => o.mileageKm,
  { targetBuckets: 12, label: (lo, hi) => `${formatK(lo)}–${formatK(hi)} km` },
);

export const priceOverall: Aggregator<PriceOverallResult> = {
  id: "price-overall",
  title: "Podsumowanie cen",
  description: "Min / mediana / średnia / maks wśród ofert z ceną.",
  compute(offers: Offer[]): PriceOverallResult {
    const priced = offers.filter((o) => o.priceAmount != null);
    const values = priced.map((o) => o.priceAmount!).sort((a, b) => a - b);
    const mm = minMax(values);
    return {
      totalOffers: offers.length,
      priced: priced.length,
      min: mm?.min ?? null,
      max: mm?.max ?? null,
      median: median(values),
      mean: mean(values),
      currency: priced[0]?.priceCurrency ?? null,
    };
  },
};
