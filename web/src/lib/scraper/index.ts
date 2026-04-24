import { parseSearchPage } from "./parse";
import type { Offer, ScrapeProgress, ScrapeResult } from "./types";
import { ScrapeError } from "./types";

export type { Offer, ScrapeProgress, ScrapeResult } from "./types";
export { ScrapeError } from "./types";
export {
  enrichAll,
  enrichOffer,
  extractEnrichedFields,
  type EnrichProgress,
  type EnrichedFields,
} from "./enrich";

export interface ScrapeOptions {
  /** Proxy endpoint that accepts `?url=<encoded target>` and returns upstream body. */
  proxyUrl: string;
  /** Maximum number of pages to fetch (safety cap). */
  maxPages?: number;
  /** Concurrency for page fetches after the first. */
  concurrency?: number;
  /** Abort signal to cancel the scrape. */
  signal?: AbortSignal;
  /** Called whenever progress advances. */
  onProgress?: (p: ScrapeProgress) => void;
}

const DEFAULT_MAX_PAGES = 500;
const DEFAULT_CONCURRENCY = 4;

export async function scrape(
  searchUrl: string,
  opts: ScrapeOptions,
): Promise<ScrapeResult> {
  const startedAt = Date.now();
  const maxPages = opts.maxPages ?? DEFAULT_MAX_PAGES;
  const concurrency = Math.max(1, opts.concurrency ?? DEFAULT_CONCURRENCY);

  const first = await fetchPage(searchUrl, 1, opts);
  const totalPages = Math.max(
    1,
    Math.min(
      maxPages,
      Math.ceil(first.totalCount / Math.max(1, first.pageSize)),
    ),
  );

  const allOffers: Offer[] = [...first.offers];
  const seen = new Set(first.offers.map((o) => o.id));

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

  const worker = async () => {
    while (nextIdx < pages.length) {
      if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const page = pages[nextIdx++]!;
      const parsed = await fetchPage(searchUrl, page, opts);
      for (const o of parsed.offers) {
        if (seen.has(o.id)) continue;
        seen.add(o.id);
        allOffers.push(o);
      }
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

async function fetchPage(
  searchUrl: string,
  page: number,
  opts: Pick<ScrapeOptions, "proxyUrl" | "signal">,
) {
  const target = withPage(searchUrl, page);
  const proxied = `${opts.proxyUrl}?url=${encodeURIComponent(target)}`;
  let res: Response;
  try {
    res = await fetch(proxied, { signal: opts.signal });
  } catch (e) {
    throw new ScrapeError(
      `Network error fetching page ${page}: ${(e as Error).message}`,
      page,
      e,
    );
  }
  if (!res.ok) {
    throw new ScrapeError(
      `Proxy returned ${res.status} for page ${page}`,
      page,
    );
  }
  const html = await res.text();
  try {
    return parseSearchPage(html);
  } catch (e) {
    throw new ScrapeError(
      `Failed to parse page ${page}: ${(e as Error).message}`,
      page,
      e,
    );
  }
}

export function withPage(searchUrl: string, page: number): string {
  const u = new URL(searchUrl);
  if (page <= 1) u.searchParams.delete("page");
  else u.searchParams.set("page", String(page));
  return u.toString();
}
