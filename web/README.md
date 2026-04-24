# web

SvelteKit + TypeScript + Tailwind frontend for Otomoto Aggregator. Builds to a
static site via `@sveltejs/adapter-static` and is deployed to GitHub Pages.

See the [top-level README](../README.md) for architecture, setup, and deploy
instructions. Prefer the `justfile` recipes at the repo root (`just dev`,
`just build`, `just check`) instead of invoking `pnpm` here directly.

## Environment

- `VITE_PROXY_URL` — URL of the Cloudflare Worker CORS proxy (see
  `.env.example`). Required at build time.
- `BASE_PATH` — sub-path for project-site deploys (e.g. `/otomoto-aggregator`);
  empty for root or user/org sites.
