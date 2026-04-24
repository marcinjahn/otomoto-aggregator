export interface Offer {
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
