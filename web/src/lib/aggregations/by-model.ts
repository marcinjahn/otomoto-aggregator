import type { Offer } from "../scraper/types";
import type { Aggregator, ByModelResult, ModelBucket } from "./types";
import { median, minMax } from "./stats";

function key(o: Offer): string | null {
  if (!o.make || !o.model) return null;
  return `${o.make}__${o.model}`;
}

export const byModel: Aggregator<ByModelResult> = {
  id: "by-model",
  title: "By model",
  description:
    "Each make + model with offer count, price range, year range, and a sample photo.",
  compute(offers: Offer[]): ByModelResult {
    const grouped = new Map<string, Offer[]>();
    let offersWithoutModel = 0;
    for (const o of offers) {
      const k = key(o);
      if (!k) {
        offersWithoutModel++;
        continue;
      }
      let list = grouped.get(k);
      if (!list) {
        list = [];
        grouped.set(k, list);
      }
      list.push(o);
    }

    const models: ModelBucket[] = [];
    for (const [, list] of grouped) {
      models.push(buildBucket(list));
    }
    models.sort((a, b) => b.count - a.count);

    return { models, totalOffers: offers.length, offersWithoutModel };
  },
};

function buildBucket(list: Offer[]): ModelBucket {
  const first = list[0]!;
  const prices = list
    .map((o) => o.priceAmount)
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b);
  const years = list
    .map((o) => o.year)
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b);
  const mileages = list
    .map((o) => o.mileageKm)
    .filter((v): v is number => v != null)
    .sort((a, b) => a - b);

  const priceMM = minMax(prices);
  const yearMM = minMax(years);
  const mileageMM = minMax(mileages);

  const fuelMix: Record<string, number> = {};
  const gearboxMix: Record<string, number> = {};
  let sampleThumbnail: string | null = null;

  for (const o of list) {
    if (o.fuelTypeDisplay)
      fuelMix[o.fuelTypeDisplay] = (fuelMix[o.fuelTypeDisplay] ?? 0) + 1;
    if (o.gearboxDisplay)
      gearboxMix[o.gearboxDisplay] = (gearboxMix[o.gearboxDisplay] ?? 0) + 1;
    if (!sampleThumbnail && (o.thumbnailLarge ?? o.thumbnailSmall)) {
      sampleThumbnail = o.thumbnailLarge ?? o.thumbnailSmall;
    }
  }

  return {
    make: first.make ?? "unknown",
    makeDisplay: first.makeDisplay ?? first.make ?? "Unknown",
    model: first.model ?? "unknown",
    modelDisplay: first.modelDisplay ?? first.model ?? "Unknown",
    count: list.length,
    priceRange: priceMM,
    priceMedian: median(prices),
    yearRange: yearMM,
    yearMedian: median(years),
    mileageRange: mileageMM,
    mileageMedian: median(mileages),
    fuelMix,
    gearboxMix,
    sampleThumbnail,
    offers: list,
  };
}
