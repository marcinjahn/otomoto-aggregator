import type { Offer } from "../scraper/types";

export interface Aggregator<TResult> {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  compute(offers: Offer[]): TResult;
}

export interface Range {
  min: number;
  max: number;
}

export interface GenerationBucket {
  /** Raw otomoto generation code, or `__nogen__` when offers have no generation metadata. */
  code: string;
  /** Human-readable label. `(No generation)` for the nogen bucket. */
  display: string;
  startYear: number | null;
  count: number;
  priceRange: Range | null;
  yearRange: Range | null;
  sampleThumbnail: string | null;
}

export interface ModelBucket {
  make: string;
  makeDisplay: string;
  model: string;
  modelDisplay: string;
  count: number;
  priceRange: Range | null;
  priceMedian: number | null;
  yearRange: Range | null;
  yearMedian: number | null;
  mileageRange: Range | null;
  mileageMedian: number | null;
  fuelMix: Record<string, number>;
  gearboxMix: Record<string, number>;
  sampleThumbnail: string | null;
  offers: Offer[];
  /** Generation breakdown ordered by startYear desc then count desc. Always has at least 1 entry. */
  generations: GenerationBucket[];
}

export interface ByModelResult {
  models: ModelBucket[];
  totalOffers: number;
  offersWithoutModel: number;
}

export interface CategoricalBucket {
  key: string;
  display: string;
  count: number;
  share: number;
}

export interface CategoricalResult {
  buckets: CategoricalBucket[];
  totalCounted: number;
  totalMissing: number;
}

export interface HistogramBucket {
  lowInclusive: number;
  highExclusive: number;
  count: number;
  label: string;
}

export interface HistogramResult {
  buckets: HistogramBucket[];
  totalCounted: number;
  totalMissing: number;
  min: number | null;
  max: number | null;
  median: number | null;
  mean: number | null;
}

export interface PriceOverallResult {
  totalOffers: number;
  priced: number;
  min: number | null;
  max: number | null;
  median: number | null;
  mean: number | null;
  currency: string | null;
}
