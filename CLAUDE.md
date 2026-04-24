# Otomoto Aggregator

Static SvelteKit frontend (`web/`) + Cloudflare Worker CORS proxy (`worker/`). The
frontend builds an otomoto.pl search URL from an on-page filter form, scrapes
every result page through the proxy, enriches each offer from its detail page,
and shows aggregations + a sortable offers list. Offers stream in page-by-page.

## Non-obvious data flow

- `otomoto-filters/data.json` is a static snapshot of otomoto's filter tree
  (makes, per-make models, per-model generations, enum values, range
  suggestions, equipment booleans) pulled from `__NEXT_DATA__` at
  `https://www.otomoto.pl/osobowe`. Regenerate by hand when otomoto changes
  the tree.
- `otomoto-filters/build-url.ts` has `buildOtomotoUrl` + its inverse
  `parseOtomotoUrl`. Otomoto accepts `search[<id>]=<v>` for everything —
  multis as `search[id][i]`, ranges as `search[id:from]` / `:to`. We always
  submit as query string (otomoto auto-canonicalises into its path segments).
- `scraper/index.ts` emits `onBatch(newOffers)` per page so the UI can render
  results live. AbortError passes through unwrapped — do not wrap it in
  `ScrapeError` or the caller can't distinguish cancel from network failure.
- Two _different_ "filter" concepts: `otomoto-filters/` = pre-scrape form
  state driving the otomoto URL; `filters/` = post-scrape `FilterState`
  narrowing the already-fetched offers in the sidebar. Don't mix them.

## URL sync

- `?q=<encodedOtomotoUrl>` mirrors the live form state via
  `history.replaceState` on every filter toggle (see
  `SearchForm.onChange`).
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
  — see `ui/image.ts`.
- Offer listings carry no `generation`; that only exists on detail pages
  under `parametersDict.generation` and is often blank. Enrichment fills
  it in progressively.
- Duplicate offer IDs across pages (TopAds) are deduped by the scraper.
- Wikipedia model photos bias toward the iconic article (e.g. Fiat 500
  1957 over 2007); we pass a year hint but don't always win.
- Viewport disables user-scaling; outer container is `overflow-x-hidden`.
- Mobile post-scrape filters are a slide-in drawer; form is a plain stack.
