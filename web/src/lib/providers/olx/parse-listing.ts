import type { Offer } from "../../scraper/types";
import { translate, translateMakeModelOlxToOtomoto } from "./mapping";

const OLX_OFFER_BASE = "https://www.olx.pl";

export interface ParsedOlxPage {
  offers: Offer[];
  totalCount: number;
  totalPages: number;
  pageSize: number;
  currentPage: number;
}

interface RawAd {
  id: number | string;
  title: string;
  description?: string | null;
  url: string;
  externalUrl?: string | null;
  partner?: { code?: string; name?: string } | null;
  isBusiness?: boolean;
  createdTime?: string | null;
  price?: { regularPrice?: { value?: number; currencyCode?: string } } | null;
  location?: {
    cityName?: string | null;
    regionName?: string | null;
    districtName?: string | null;
  } | null;
  photos?: Array<{ link?: string; width?: number; height?: number } | string>;
  category?: { id?: number | string } | null;
  params?: Array<{
    key: string;
    name?: string;
    value?: { key?: string; label?: string } | string | null;
    normalizedValue?: string | null;
  }>;
}

interface RawCategory {
  id?: number | string;
  label?: string;
  name?: string;
  parentId?: number | string;
}

/**
 * Convert an olx parsed __PRERENDERED_STATE__ object into a uniform
 * `ParsedOlxPage`. Throws on missing structural fields; missing per-ad
 * fields are tolerated (Offer slots become null).
 */
export function parseOlxListing(state: unknown): ParsedOlxPage {
  const listing = (state as any)?.listing?.listing;
  if (!listing) {
    throw new Error("listing.listing missing from olx __PRERENDERED_STATE__");
  }
  const ads: RawAd[] = Array.isArray(listing.ads) ? listing.ads : [];
  const totalCount =
    typeof listing.totalElements === "number" ? listing.totalElements : 0;
  const totalPages =
    typeof listing.totalPages === "number" ? listing.totalPages : 0;
  const pageSize = (state as any)?.params?.limit ?? 40;
  const currentPage = (state as any)?.params?.page ?? 1;
  const categories: Record<string, RawCategory> =
    (state as any)?.categories?.list ?? {};

  const offers = ads.map((ad) => adToOffer(ad, categories));
  return { offers, totalCount, totalPages, pageSize, currentPage };
}

function adToOffer(ad: RawAd, categories: Record<string, RawCategory>): Offer {
  const p = indexParams(ad.params ?? []);
  const modelRaw = p.get("model");
  const fuelRaw = p.get("petrol");
  const gearboxRaw = p.get("transmission");
  const yearRaw = p.get("year");
  // Note the misspelling: olx's mileage field is `milage` (one l).
  const mileageRaw = p.get("milage");
  const capacityRaw = p.get("enginesize");
  const powerRaw = p.get("enginepower");

  // olx no longer ships a "make" param — the make is encoded in the ad's
  // category. Each car-make is a child category of 84 (Samochody osobowe);
  // its `label` is the olx make slug, `name` the display label.
  const makeFromCat =
    ad.category?.id != null ? categories[String(ad.category.id)] : undefined;
  const makeOlxSlug = makeFromCat?.label ?? null;
  const makeDisplay = makeFromCat?.name ?? null;

  const { make, model } = makeOlxSlug
    ? translateMakeModelOlxToOtomoto(makeOlxSlug, modelRaw?.value ?? null)
    : { make: null as string | null, model: null as string | null };

  const fuel = fuelRaw
    ? translate("fuel", "olxToOtomoto", fuelRaw.value)
    : null;
  const gearbox = gearboxRaw
    ? translate("gearbox", "olxToOtomoto", gearboxRaw.value)
    : null;

  const url = ensureAbsoluteOlxUrl(ad.url);
  const photo = pickPhoto(ad.photos);

  return {
    source: "olx",
    id: `olx-${ad.id}`,
    title: ad.title,
    shortDescription: ad.description ?? null,
    url,
    priceAmount:
      typeof ad.price?.regularPrice?.value === "number"
        ? ad.price.regularPrice.value
        : null,
    priceCurrency: ad.price?.regularPrice?.currencyCode ?? null,
    city: ad.location?.cityName ?? null,
    region: ad.location?.regionName ?? null,
    thumbnailSmall: photo,
    thumbnailLarge: photo,
    make,
    makeDisplay: makeDisplay ?? make ?? null,
    model,
    modelDisplay: modelRaw?.label ?? model ?? null,
    year: toInt(yearRaw?.value),
    fuelType: fuel,
    fuelTypeDisplay: fuelRaw?.label ?? fuel,
    gearbox,
    gearboxDisplay: gearboxRaw?.label ?? gearbox,
    mileageKm: toInt(mileageRaw?.value),
    engineCapacityCm3: toInt(capacityRaw?.value),
    enginePowerHp: toInt(powerRaw?.value),
    createdAt: ad.createdTime ?? null,
    generation: null,
    generationCode: null,
    generationStartYear: null,
    otomotoTwinId: syndicatedOtomotoId(ad),
  };
}

interface NormalizedParam {
  value: string;
  label: string | null;
}

function indexParams(arr: RawAd["params"] = []): Map<string, NormalizedParam> {
  const out = new Map<string, NormalizedParam>();
  for (const p of arr ?? []) {
    if (!p || typeof p.key !== "string") continue;
    const raw = p.value;
    // olx params now ship as `{ value: <display>, normalizedValue: <slug> }`.
    // We expose the slug as `value` (so translations and toInt work) and keep
    // the display string as `label` (used for *Display fields).
    let slug: string | null = null;
    let label: string | null = null;
    if (typeof p.normalizedValue === "string" && p.normalizedValue) {
      slug = p.normalizedValue;
    }
    if (raw == null) {
      // no-op; slug may still be present
    } else if (typeof raw === "string") {
      label = raw;
      if (!slug) slug = raw;
    } else if (typeof raw === "object") {
      label = raw.label ?? null;
      if (!slug) slug = (raw.key ?? raw.label ?? "").toString() || null;
    } else {
      const s = String(raw);
      label = s;
      if (!slug) slug = s;
    }
    if (!slug) continue;
    out.set(p.key, { value: slug, label });
  }
  return out;
}

function toInt(v: string | undefined): number | null {
  if (v == null) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function ensureAbsoluteOlxUrl(url: string): string {
  if (!url) return url;
  if (/^https?:\/\//.test(url)) return url;
  return `${OLX_OFFER_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

function pickPhoto(photos: RawAd["photos"] = []): string | null {
  if (!photos || photos.length === 0) return null;
  const first = photos[0];
  if (!first) return null;
  if (typeof first === "string") return first;
  return first.link ?? null;
}

/**
 * olx ads syndicated from otomoto carry `partner.code === "otomoto_pl_form"`
 * and an `externalUrl` pointing at the otomoto offer. The trailing `ID<base36>`
 * token in that URL is the canonical otomoto offer id.
 */
export function syndicatedOtomotoId(ad: {
  partner?: { code?: string } | null;
  externalUrl?: string | null;
}): string | null {
  if (ad.partner?.code !== "otomoto_pl_form") return null;
  const url = ad.externalUrl;
  if (!url) return null;
  const m = /ID([A-Za-z0-9]+)(?:[/?#]|$)/.exec(url);
  return m ? m[1]! : null;
}
