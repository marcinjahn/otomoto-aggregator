# Otomoto Aggregator

Static SvelteKit frontend (`web/`) + Cloudflare Worker CORS proxy (`worker/`). The
frontend builds search URLs for **otomoto.pl** and **olx.pl** from a single
on-page filter form, scrapes every result page through the proxy in parallel,
merges + de-duplicates the results, enriches otomoto offers from their detail
pages, and shows aggregations + a sortable offers list. Offers stream in
page-by-page from each provider as they arrive.

## Providers

- Each provider lives under `web/src/lib/providers/<id>/` and implements the
  `Provider` interface in `providers/types.ts` (id, label, supported /
  unsupported filter ids, `buildUrl`, optional `parseUrl`, `scrape`, optional
  `enrich`, `resultsPageUrl`). The single source of truth is
  `providers/registry.ts`.
- Currently registered: `otomoto` (full filter coverage, detail-page
  enrichment for `generation`) and `olx` (a narrower filter subset — see
  `olx/index.ts` `SUPPORTED` / `UNSUPPORTED`; no enrichment).
- `filter-compat/resolver.ts` is the single source of truth for what URL a
  provider builds and what the user sees in the "ignored filters" banner /
  per-offer "warunki niepełne" pill. Form-state filter ids the provider can't
  honor are stripped from the URL and reported as `dropped`.
- `search/orchestrator.ts` runs all selected providers in parallel; one
  provider's failure is surfaced inline and does not abort the others, but
  AbortError still propagates so user-cancel is distinguishable from network
  failures.
- `search/dedup.ts` (`StreamingDedup`) merges per-page batches across
  providers. Rule: an olx ad whose externalUrl encodes an `otomotoTwinId` is
  dropped in favor of the otomoto record; if otomoto arrives later, it
  replaces the olx twin in place so list ordering stays stable.
- Adding a provider = (1) new folder under `web/src/lib/providers/<id>/`
  implementing `Provider`, (2) one entry in `providers/registry.ts`, (3) one
  hostname in `worker/wrangler.toml` `TARGET_HOSTS`.

## Non-obvious data flow

- `form/data.json` is a static snapshot of otomoto's filter tree (makes,
  per-make models, per-model generations, enum values, range suggestions,
  equipment booleans) pulled from `__NEXT_DATA__` at
  `https://www.otomoto.pl/osobowe`. Regenerate by hand when otomoto changes
  the tree. The form is otomoto-shaped because otomoto has the richest
  taxonomy; olx maps onto a subset of these ids via `providers/olx/mapping.ts`.
- `providers/otomoto/build-url.ts` has `buildOtomotoUrl` + its inverse
  `parseOtomotoUrl`. Otomoto accepts `search[<id>]=<v>` for everything —
  multis as `search[id][i]`, ranges as `search[id:from]` / `:to`. We always
  submit as query string (otomoto auto-canonicalises into its path segments).
- `providers/olx/build-url.ts` translates the same form state into olx's
  `?search[...]=...` shape; supported makes/models/enums route through
  `mapping.ts`.
- Each provider's `scrape` emits `onBatch(newOffers)` per page so the UI can
  render results live. AbortError passes through unwrapped — do not wrap it in
  `ScrapeError` or the caller can't distinguish cancel from network failure.
- Two _different_ "filter" concepts: `form/` = pre-scrape form state driving
  the per-provider URLs; `filters/` = post-scrape `FilterState` narrowing the
  already-fetched (and merged) offers in the sidebar. Don't mix them.

## URL sync

- `?q=<encodedOtomotoUrl>` mirrors the live form state via
  `history.replaceState` on every filter toggle (see
  `SearchForm.onChange`). The URL stays otomoto-shaped because otomoto's
  taxonomy is the superset; olx's URL is derived from the parsed form state
  at scrape time.
- Landing on a `?q=` link pre-populates the form but does **not**
  auto-scrape. "Nowe wyszukiwanie" clears results but keeps the URL / form
  intact.

## Deliberate exclusions

- No text inputs anywhere in the form; ranges use sliders snapped to
  otomoto's suggestion list.
- We drop otomoto's free-text `q`, GenAI, and affordability calculator
  components. No filter is auto-selected.
- UI copy is Polish.

## Other gotchas

- Otomoto CDN accepts `;s=WxH` for arbitrary image sizes (up to ~1400×1050)
  — see `ui/image.ts`. OLX images go through their own CDN with a different
  sizing scheme.
- Otomoto offer listings carry no `generation`; that only exists on detail
  pages under `parametersDict.generation` and is often blank. Enrichment fills
  it in progressively. OLX has no equivalent and is not enriched.
- Duplicate offer IDs across pages (TopAds) are deduped per-provider by the
  scraper; cross-provider deduping (otomoto-canonical wins over its olx
  syndicated twin) lives in `search/dedup.ts`.
- Wikipedia model photos bias toward the iconic article (e.g. Fiat 500
  1957 over 2007); we pass a year hint but don't always win.
- Viewport disables user-scaling; outer container is `overflow-x-hidden`.
- Mobile post-scrape filters are a slide-in drawer; form is a plain stack.
