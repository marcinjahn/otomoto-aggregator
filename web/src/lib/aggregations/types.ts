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

export interface ModelBucket {
  make: string;
  makeDisplay: string;
  model: string;
  modelDisplay: string;
  count: number;
  priceRange: Range | null;
  priceMedian: number | null;
  yearRange: Range | null;
  mileageRange: Range | null;
  mileageMedian: number | null;
  fuelMix: Record<string, number>;
  gearboxMix: Record<string, number>;
  sampleThumbnail: string | null;
  offers: Offer[];
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
