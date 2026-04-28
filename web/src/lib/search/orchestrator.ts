import type { SearchFormState } from "../form/types";
import { resolveFilters, type DroppedFilter } from "../filter-compat/resolver";
import type { Provider, ProviderId } from "../providers/types";
import type { Offer, ScrapeProgress } from "../scraper/types";
import { StreamingDedup } from "./dedup";

export interface ProviderProgressEntry {
  id: ProviderId;
  label: string;
  /** undefined while in flight; set on completion. */
  done: boolean;
  pagesCompleted: number;
  totalPages: number;
  offersCollected: number;
  totalOffers: number;
  /** Inline error message, displayed under the provider's progress bar. */
  error: string | null;
  /** Filters dropped from this provider's URL by the resolver. */
  dropped: DroppedFilter[];
}

export interface OrchestratorEvents {
  /** A new batch of *deduped* offers has arrived; append to the rendered list. */
  onAppend?: (newOffers: Offer[]) => void;
  /** A late otomoto arrival has replaced an olx twin already in the list. */
  onReplace?: (changes: Array<{ index: number; offer: Offer }>) => void;
  /** Per-provider progress (called frequently). */
  onProgress?: (entries: ProviderProgressEntry[]) => void;
  /** A specific provider just enriched an offer (otomoto only in v1). */
  onEnrichOffer?: (offerId: string, fields: Partial<Offer>) => void;
  /** Per-provider enrichment progress. */
  onEnrichProgress?: (
    providerId: ProviderId,
    p: { enriched: number; total: number; failed: number },
  ) => void;
}

export interface OrchestratorOptions extends OrchestratorEvents {
  proxyUrl: string;
  signal: AbortSignal;
  providers: Provider[];
  form: SearchFormState;
}

export interface OrchestratorResult {
  offers: Offer[];
  perProvider: ProviderProgressEntry[];
}

/**
 * Drive parallel scrapes across N providers. One provider's failure does not
 * abort the others (caught and surfaced as `error` on its progress entry).
 * AbortError still propagates up so the caller can distinguish user-cancel
 * from network failures.
 *
 * Otomoto enrichment kicks off the moment otomoto's scrape completes,
 * regardless of whether olx is still streaming.
 */
export async function runSearch(
  opts: OrchestratorOptions,
): Promise<OrchestratorResult> {
  const dedup = new StreamingDedup();
  const entries: Map<ProviderId, ProviderProgressEntry> = new Map();
  for (const p of opts.providers) {
    const { dropped } = resolveFilters(opts.form, p);
    entries.set(p.id, {
      id: p.id,
      label: p.label,
      done: false,
      pagesCompleted: 0,
      totalPages: 0,
      offersCollected: 0,
      totalOffers: 0,
      error: null,
      dropped,
    });
  }
  const emitProgress = () => {
    opts.onProgress?.(orderedEntries(entries, opts.providers));
  };
  emitProgress();

  let aborted = false;

  const tasks = opts.providers.map(async (p) => {
    const entry = entries.get(p.id)!;
    const { urlFilters, dropped } = resolveFilters(opts.form, p);
    const url = p.buildUrl(urlFilters);
    const droppedIds = dropped.map((d) => d.id);
    try {
      const res = await p.scrape(url, {
        proxyUrl: opts.proxyUrl,
        signal: opts.signal,
        droppedFilters: droppedIds,
        onProgress: (sp: ScrapeProgress) => {
          entry.pagesCompleted = sp.pagesCompleted;
          entry.totalPages = sp.totalPages;
          entry.offersCollected = sp.offersCollected;
          entry.totalOffers = sp.totalOffers;
          emitProgress();
        },
        onBatch: (batch) => {
          const { appended, replaced } = dedup.add(batch);
          if (appended.length) opts.onAppend?.(appended);
          if (replaced.length) opts.onReplace?.(replaced);
        },
      });
      // Final reconciliation in case the provider didn't emit a per-page
      // batch covering its full set (defensive — both providers do).
      entry.done = true;
      entry.offersCollected = Math.max(
        entry.offersCollected,
        res.offers.length,
      );
      emitProgress();

      // Kick off enrichment for this provider asynchronously. We *don't* await
      // it inside the parallel block because per-PRD enrichment runs in the
      // background — the function returns once both providers finish their
      // scrape pass, and enrichment continues afterwards via a separate
      // promise.
      if (p.enrich) {
        void runEnrichment(p, res.offers, opts);
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        aborted = true;
        throw e;
      }
      entry.error = (e as Error).message;
      entry.done = true;
      emitProgress();
    }
  });

  try {
    await Promise.all(tasks);
  } catch (e) {
    if (aborted) throw e;
    // We caught provider-specific errors above; only AbortError reaches here.
    throw e;
  }

  return {
    offers: [...dedup.offers],
    perProvider: orderedEntries(entries, opts.providers),
  };
}

async function runEnrichment(
  p: Provider,
  offers: readonly Offer[],
  opts: OrchestratorOptions,
): Promise<void> {
  if (!p.enrich) return;
  try {
    await p.enrich(offers, {
      proxyUrl: opts.proxyUrl,
      signal: opts.signal,
      onProgress: (pr) => opts.onEnrichProgress?.(p.id, pr),
      onOffer: (offerId, fields) => opts.onEnrichOffer?.(offerId, fields),
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
  }
}

function orderedEntries(
  entries: Map<ProviderId, ProviderProgressEntry>,
  providers: Provider[],
): ProviderProgressEntry[] {
  return providers.map((p) => entries.get(p.id)!);
}
