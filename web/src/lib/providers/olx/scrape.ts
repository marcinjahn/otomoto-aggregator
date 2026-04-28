import {
  ScrapeError,
  type Offer,
  type ScrapeProgress,
  type ScrapeResult,
} from "../../scraper/types";
import { decodePrerenderedState } from "./decoder";
import { parseOlxListing } from "./parse-listing";
import { withOlxPage } from "./build-url";

export interface OlxScrapeOptions {
  proxyUrl: string;
  maxPages?: number;
  concurrency?: number;
  signal?: AbortSignal;
  onProgress?: (p: ScrapeProgress) => void;
  onBatch?: (newOffers: Offer[]) => void;
  /** Filters dropped from this scrape's URL; tagged onto every offer. */
  droppedFilters?: string[];
}

const DEFAULT_MAX_PAGES = 25; // olx caps totalElements at 1000 (40 per page).
const DEFAULT_CONCURRENCY = 4;

export async function scrapeOlx(
  searchUrl: string,
  opts: OlxScrapeOptions,
): Promise<ScrapeResult> {
  const startedAt = Date.now();
  const maxPages = opts.maxPages ?? DEFAULT_MAX_PAGES;
  const concurrency = Math.max(1, opts.concurrency ?? DEFAULT_CONCURRENCY);

  const first = await fetchOlxPage(searchUrl, 1, opts);
  const totalPages = Math.max(1, Math.min(maxPages, first.totalPages || 1));

  const allOffers: Offer[] = [...applyDropped(first.offers, opts)];
  const seen = new Set(first.offers.map((o) => o.id));

  if (first.offers.length) {
    opts.onBatch?.([...applyDropped(first.offers, opts)]);
  }

  opts.onProgress?.({
    pagesCompleted: 1,
    totalPages,
    offersCollected: allOffers.length,
    totalOffers: first.totalCount,
    done: totalPages <= 1,
  });

  if (totalPages <= 1) {
    return {
      offers: allOffers,
      totalOffers: first.totalCount,
      pagesFetched: 1,
      startedAt,
      finishedAt: Date.now(),
    };
  }

  const pages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
  let nextIdx = 0;
  let pagesDone = 1;
  let exhausted = false;

  const worker = async () => {
    while (nextIdx < pages.length && !exhausted) {
      if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const page = pages[nextIdx++]!;
      let parsed;
      try {
        parsed = await fetchOlxPage(searchUrl, page, opts);
      } catch (e) {
        if (
          e instanceof ScrapeError &&
          /listing.listing missing/.test(e.message)
        ) {
          exhausted = true;
          return;
        }
        throw e;
      }
      const fresh: Offer[] = [];
      for (const raw of applyDropped(parsed.offers, opts)) {
        if (seen.has(raw.id)) continue;
        seen.add(raw.id);
        allOffers.push(raw);
        fresh.push(raw);
      }
      if (fresh.length) opts.onBatch?.(fresh);
      pagesDone++;
      opts.onProgress?.({
        pagesCompleted: pagesDone,
        totalPages,
        offersCollected: allOffers.length,
        totalOffers: first.totalCount,
        done: pagesDone >= totalPages,
      });
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));

  return {
    offers: allOffers,
    totalOffers: first.totalCount,
    pagesFetched: pagesDone,
    startedAt,
    finishedAt: Date.now(),
  };
}

async function fetchOlxPage(
  searchUrl: string,
  page: number,
  opts: Pick<OlxScrapeOptions, "proxyUrl" | "signal">,
) {
  const target = withOlxPage(searchUrl, page);
  const proxied = `${opts.proxyUrl}?url=${encodeURIComponent(target)}`;
  let res: Response;
  try {
    res = await fetch(proxied, { signal: opts.signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ScrapeError(
      `Network error fetching olx page ${page}: ${(e as Error).message}`,
      page,
      e,
    );
  }
  if (!res.ok) {
    throw new ScrapeError(
      `Proxy returned ${res.status} for olx page ${page}`,
      page,
    );
  }
  const html = await res.text();
  let state: unknown;
  try {
    state = decodePrerenderedState(html);
  } catch (e) {
    throw new ScrapeError(
      `Failed to decode olx page ${page}: ${(e as Error).message}`,
      page,
      e,
    );
  }
  try {
    return parseOlxListing(state);
  } catch (e) {
    throw new ScrapeError(
      `Failed to parse olx page ${page}: ${(e as Error).message}`,
      page,
      e,
    );
  }
}

function applyDropped(offers: Offer[], opts: OlxScrapeOptions): Offer[] {
  const dropped = opts.droppedFilters;
  if (!dropped || dropped.length === 0) return offers;
  return offers.map((o) => ({ ...o, droppedFilters: dropped }));
}
