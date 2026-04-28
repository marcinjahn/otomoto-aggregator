# Otomoto Aggregator

Static web app that scrapes car listings from **otomoto.pl** and **olx.pl** in
parallel, walks every result page, and presents the merged offers as rich
aggregations: by model (with a sample photo, price and year ranges, drill-down
to raw offers), price / year / mileage histograms, and splits by source / make
/ fuel / gearbox / region.

The same on-page filter form drives both providers; each provider builds its
own search URL from the shared form state, scrapes its result pages, and
streams offers into a unified list. Filters that a provider can't honor are
dropped from its URL and surfaced in the UI. OLX ads syndicated from otomoto
are de-duplicated against the canonical otomoto record.

Architecture:

```
browser ──► GitHub Pages (static SvelteKit)
                 │
                 ▼
          Cloudflare Worker CORS proxy (allowlisted hosts)
                 │
          ┌──────┴──────┐
          ▼             ▼
       otomoto.pl     olx.pl
```

The frontend is a pure static SPA on GitHub Pages. The worker is a tiny,
allowlisted CORS proxy — both otomoto and olx block direct browser fetches, so
we need one hop. The set of allowed upstreams lives in `worker/wrangler.toml`
under `TARGET_HOSTS`.

## Layout

- `web/` — SvelteKit + TypeScript + Tailwind CSS (adapter-static).
- `worker/` — Cloudflare Worker CORS proxy (TypeScript, deployed with `wrangler`).
- `.github/workflows/` — separate deploy workflows for web (GitHub Pages) and
  worker (Cloudflare).

## Local development

Top-level commands are wrapped in a `justfile`. Run `just` to list recipes.

First-time setup:

```
just install
cp web/.env.example web/.env.local   # edit if the worker is on a different URL
```

Run both dev servers together (Ctrl-C stops both):

```
just dev
```

Or run them individually:

```
just worker   # wrangler dev on http://127.0.0.1:8787
just web      # vite dev on http://localhost:5173
```

No Cloudflare account is required for local dev — wrangler uses miniflare.

Open http://localhost:5173, pick filters (or paste an otomoto URL), pick which
sources to query (otomoto.pl, olx.pl, or both), and hit **Szukaj ofert**.

Other handy recipes:

```
just check          # svelte-check + worker tsc --noEmit
just build          # static build of web/
just preview        # preview the production build
just deploy-worker  # wrangler deploy
just clean          # remove web/build and web/.svelte-kit
```

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
