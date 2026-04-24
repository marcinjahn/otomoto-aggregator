import type { Offer } from "../scraper/types";
import { NO_GEN_CODE } from "../filters/types";
import type {
  Aggregator,
  ByModelResult,
  GenerationBucket,
  ModelBucket,
} from "./types";
import { median, minMax } from "./stats";

function key(o: Offer): string | null {
  if (!o.make || !o.model) return null;
  return `${o.make}__${o.model}`;
}

export const byModel: Aggregator<ByModelResult> = {
  id: "by-model",
  title: "Modele",
  description:
    "Marka + model z liczbą ofert, zakresem cen i roczników oraz zdjęciem.",
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
    generations: buildGenerations(list),
  };
}

function buildGenerations(list: Offer[]): GenerationBucket[] {
  const grouped = new Map<string, Offer[]>();
  for (const o of list) {
    const code = o.generationCode ?? NO_GEN_CODE;
    let arr = grouped.get(code);
    if (!arr) {
      arr = [];
      grouped.set(code, arr);
    }
    arr.push(o);
  }

  const buckets: GenerationBucket[] = [];
  for (const [code, offers] of grouped) {
    const first = offers[0]!;
    const prices = offers
      .map((o) => o.priceAmount)
      .filter((v): v is number => v != null);
    const years = offers
      .map((o) => o.year)
      .filter((v): v is number => v != null);
    let sample: string | null = null;
    for (const o of offers) {
      if (!sample && (o.thumbnailLarge ?? o.thumbnailSmall)) {
        sample = o.thumbnailLarge ?? o.thumbnailSmall;
        break;
      }
    }
    const isNoGen = code === NO_GEN_CODE;
    buckets.push({
      code,
      display: isNoGen ? "(No generation)" : (first.generation ?? code),
      startYear: isNoGen ? null : (first.generationStartYear ?? null),
      count: offers.length,
      priceRange: minMax(prices),
      yearRange: minMax(years),
      sampleThumbnail: sample,
    });
  }
  buckets.sort((a, b) => {
    const aYear = a.startYear ?? -Infinity;
    const bYear = b.startYear ?? -Infinity;
    if (aYear !== bYear) return bYear - aYear;
    return b.count - a.count;
  });
  return buckets;
}
