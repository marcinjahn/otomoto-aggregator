import { byModel } from "./by-model";
import { byFuelType, byGearbox, byMake, byRegion } from "./categorical";
import { bySource } from "./by-source";
import {
  mileageHistogram,
  priceHistogram,
  priceOverall,
  yearHistogram,
} from "./histograms";
import type { Aggregator } from "./types";

export * from "./types";
export { byModel, byFuelType, byGearbox, byMake, byRegion, bySource };
export { priceHistogram, yearHistogram, mileageHistogram, priceOverall };

/** Built-in aggregators in recommended display order. Register new ones here. */
export const AGGREGATORS: readonly Aggregator<unknown>[] = [
  priceOverall,
  byModel,
  priceHistogram,
  yearHistogram,
  mileageHistogram,
  byMake,
  byFuelType,
  byGearbox,
  byRegion,
  bySource,
] as const;
