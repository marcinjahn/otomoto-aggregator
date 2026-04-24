/**
 * Public config — resolved at build time via Vite env vars.
 * Set VITE_PROXY_URL to point at the deployed Cloudflare Worker.
 */
export const PROXY_URL: string | undefined = import.meta.env.VITE_PROXY_URL;

export function requireProxyUrl(): string {
  if (!PROXY_URL) {
    throw new Error(
      "VITE_PROXY_URL is not configured. Set it in .env.local or GitHub Actions secrets before building.",
    );
  }
  return PROXY_URL;
}
