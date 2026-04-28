import type { ProviderId } from "../providers/types";

export interface Offer {
  /** Origin provider for the offer. */
  source: ProviderId;
  id: string;
  title: string;
  shortDescription: string | null;
  url: string;
  priceAmount: number | null;
  priceCurrency: string | null;
  city: string | null;
  region: string | null;
  thumbnailSmall: string | null;
  thumbnailLarge: string | null;
  make: string | null;
  makeDisplay: string | null;
  model: string | null;
  modelDisplay: string | null;
  year: number | null;
  fuelType: string | null;
  fuelTypeDisplay: string | null;
  gearbox: string | null;
  gearboxDisplay: string | null;
  mileageKm: number | null;
  engineCapacityCm3: number | null;
  enginePowerHp: number | null;
  createdAt: string | null;
  // Populated by the enrichment pass (detail-page fetch), null otherwise.
  generation: string | null;
  generationCode: string | null;
  generationStartYear: number | null;
  /**
   * Filters that the provider could not honor for this scrape and were
   * therefore dropped from its URL. Surfaced on the offer tile as a small
   * "warunki niepełne" pill so the user can spot results that may not match
   * their intent. Empty/undefined when the provider honored everything.
   */
  droppedFilters?: string[];
  /**
   * For olx ads syndicated from otomoto: the otomoto offer id extracted from
   * the externalUrl trailing `ID<base36>` token. Used by the dedup function
   * to drop the olx record in favor of the otomoto canonical record.
   */
  otomotoTwinId?: string | null;
}

export interface ScrapeProgress {
  pagesCompleted: number;
  totalPages: number;
  offersCollected: number;
  totalOffers: number;
  done: boolean;
}

export interface ScrapeResult {
  offers: Offer[];
  totalOffers: number;
  pagesFetched: number;
  startedAt: number;
  finishedAt: number;
}

export class ScrapeError extends Error {
  constructor(
    message: string,
    public readonly page: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ScrapeError";
  }
}
