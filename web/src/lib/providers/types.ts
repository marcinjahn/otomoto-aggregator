import type { SearchFormState } from "../form/types";
import type { Offer, ScrapeProgress, ScrapeResult } from "../scraper/types";

export type ProviderId = "otomoto" | "olx";

export interface ProviderScrapeOptions {
  proxyUrl: string;
  signal?: AbortSignal;
  /** Filters that the resolver removed from this provider's URL. */
  droppedFilters?: string[];
  onProgress?: (p: ScrapeProgress) => void;
  onBatch?: (newOffers: Offer[]) => void;
}

export interface ProviderEnrichOptions {
  proxyUrl: string;
  signal?: AbortSignal;
  onProgress?: (p: { enriched: number; total: number; failed: number }) => void;
  onOffer?: (offerId: string, fields: Partial<Offer> & { id?: never }) => void;
}

export interface Provider {
  readonly id: ProviderId;
  /** Human-readable label for sidebar / progress display. */
  readonly label: string;
  /** Short text shown on the offer-tile badge (e.g. `OTO`, `OLX`). */
  readonly badgeText: string;
  /** Filter ids (matching SearchFormState shape) the provider can honor in its URL. */
  readonly supportedFilters: ReadonlySet<string>;
  /** Filter ids the provider cannot honor; used by the resolver to flag and drop. */
  readonly unsupportedFilters: ReadonlySet<string>;
  /** Build the search URL for the listing pages. */
  buildUrl(form: SearchFormState): string;
  /** Inverse of buildUrl: extract a SearchFormState from a provider-shaped URL. */
  parseUrl?(raw: string): SearchFormState;
  /** Run the full multi-page scrape. */
  scrape(url: string, opts: ProviderScrapeOptions): Promise<ScrapeResult>;
  /** Optional per-offer enrichment (e.g. detail-page fetch). */
  enrich?(offers: readonly Offer[], opts: ProviderEnrichOptions): Promise<void>;
  /** Public results-page URL for the "Zobacz na…" button. */
  resultsPageUrl(form: SearchFormState): string;
}
