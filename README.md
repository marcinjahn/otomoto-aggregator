# Otomoto Aggregator

Static web app that scrapes an Otomoto search-results URL, walks every result
page, and presents the collected offers as rich aggregations: by model (with a
sample photo, price and year ranges, drill-down to raw offers), price / year /
mileage histograms, and splits by make / fuel / gearbox / region.

Architecture:

```
browser ──► GitHub Pages (static SvelteKit)
                 │
                 ▼
          Cloudflare Worker CORS proxy (only proxies www.otomoto.pl)
                 │
                 ▼
              otomoto.pl
```

The frontend is a pure static SPA on GitHub Pages. The worker is a tiny,
allowlisted CORS proxy — Otomoto blocks direct browser fetches, so we need one
hop.

## Layout

- `web/` — SvelteKit + TypeScript + Tailwind CSS (adapter-static).
- `worker/` — Cloudflare Worker CORS proxy (TypeScript, deployed with `wrangler`).
- `.github/workflows/` — separate deploy workflows for web (GitHub Pages) and
  worker (Cloudflare).

## Local development

### Worker

```
cd worker
pnpm install
pnpm dev     # runs wrangler dev on http://127.0.0.1:8787
```

No Cloudflare account is required for local dev — wrangler uses miniflare.

### Web

```
cd web
pnpm install
cp .env.example .env.local
# edit .env.local if your worker is on a different URL
pnpm dev
```

Open http://localhost:5173, paste an Otomoto search URL, hit Scrape.

## Deployment

### Cloudflare Worker (one-time setup)

1. Sign in to Cloudflare and create an API token with the "Edit Cloudflare
   Workers" template. Grab your account ID from the dashboard.
2. `cd worker && pnpm install`
3. `npx wrangler login` (or set `CLOUDFLARE_API_TOKEN` env var).
4. `pnpm deploy` — deploys the worker and prints its URL, e.g.
   `https://otomoto-aggregator-proxy.<your-subdomain>.workers.dev`.
5. In `worker/wrangler.toml`, set `ALLOWED_ORIGINS` to include your GitHub Pages
   origin, e.g. `"https://<username>.github.io"`, then redeploy.
6. For CI auto-deploy, add these repo secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`

### GitHub Pages

1. In repo Settings → Pages, set source to "GitHub Actions".
2. In repo Settings → Secrets and variables → Actions → Variables, add:
   - `VITE_PROXY_URL` — your worker URL from above.
   - `BASE_PATH` — `/otomoto-aggregator` (matches the repo name for a project
     site); leave empty for a user/org site or a root domain.
3. Push to `main` — the web workflow builds and deploys automatically.

## Adding a new aggregation

1. Define a compute function in `web/src/lib/aggregations/<your-file>.ts`:
   ```ts
   export const yourAgg: Aggregator<YourResult> = {
     id: "your-agg",
     title: "Your aggregation",
     description: "…",
     compute(offers) {
       /* … */
     },
   };
   ```
2. Export it from `web/src/lib/aggregations/index.ts` and (optionally) add it to
   the `AGGREGATORS` array.
3. Render its result in `web/src/routes/+page.svelte`, reusing one of the
   existing `ui/*` components (histogram, categorical list, etc.) or writing a
   new one under `web/src/lib/ui/`.
