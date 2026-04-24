import type { Offer } from "./types";

const NEXT_DATA_RE = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;

export interface EnrichedFields {
  generation: string | null;
  generationCode: string | null;
  generationStartYear: number | null;
}

export interface EnrichProgress {
  enriched: number;
  total: number;
  failed: number;
}

export interface EnrichOptions {
  proxyUrl: string;
  concurrency?: number;
  signal?: AbortSignal;
  onProgress?: (p: EnrichProgress) => void;
  /** Called each time a single offer is enriched with fresh fields. */
  onOffer?: (offerId: string, fields: EnrichedFields) => void;
}

const DEFAULT_CONCURRENCY = 6;

export async function enrichAll(
  offers: readonly Offer[],
  opts: EnrichOptions,
): Promise<void> {
  const concurrency = Math.max(1, opts.concurrency ?? DEFAULT_CONCURRENCY);
  let nextIdx = 0;
  let enriched = 0;
  let failed = 0;

  const worker = async () => {
    while (nextIdx < offers.length) {
      if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const offer = offers[nextIdx++]!;
      try {
        const fields = await enrichOffer(offer.url, opts.proxyUrl, opts.signal);
        opts.onOffer?.(offer.id, fields);
      } catch {
        failed++;
      }
      enriched++;
      opts.onProgress?.({ enriched, total: offers.length, failed });
    }
  };

  await Promise.all(Array.from({ length: concurrency }, worker));
}

export async function enrichOffer(
  offerUrl: string,
  proxyUrl: string,
  signal?: AbortSignal,
): Promise<EnrichedFields> {
  const proxied = `${proxyUrl}?url=${encodeURIComponent(offerUrl)}`;
  const res = await fetch(proxied, { signal });
  if (!res.ok) throw new Error(`Proxy ${res.status}`);
  const html = await res.text();
  return extractEnrichedFields(html);
}

export function extractEnrichedFields(html: string): EnrichedFields {
  const m = NEXT_DATA_RE.exec(html);
  if (!m) return empty();
  let root: unknown;
  try {
    root = JSON.parse(m[1]!);
  } catch {
    return empty();
  }
  const dict = (root as any)?.props?.pageProps?.advert?.parametersDict;
  if (!dict || typeof dict !== "object") return empty();
  const gen = dict.generation?.values?.[0];
  if (!gen) return empty();
  const display = typeof gen.label === "string" ? gen.label : null;
  const code = typeof gen.value === "string" ? gen.value : null;
  return {
    generation: display,
    generationCode: code,
    generationStartYear: parseStartYear(display),
  };
}

function empty(): EnrichedFields {
  return {
    generation: null,
    generationCode: null,
    generationStartYear: null,
  };
}

function parseStartYear(s: string | null): number | null {
  if (!s) return null;
  const m = /\((\d{4})[-–]/.exec(s);
  if (!m) return null;
  const n = Number.parseInt(m[1]!, 10);
  return Number.isFinite(n) ? n : null;
}
