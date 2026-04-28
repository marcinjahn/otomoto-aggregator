import { otomotoProvider } from "./otomoto";
import { olxProvider } from "./olx";
import type { Provider, ProviderId } from "./types";

/**
 * The single registry of providers. Adding a new source =
 *   1. new folder under `lib/providers/<id>/` implementing `Provider`,
 *   2. one entry in this array,
 *   3. one entry in worker `TARGET_HOSTS`.
 */
export const PROVIDERS: readonly Provider[] = [otomotoProvider, olxProvider];

const BY_ID = new Map(PROVIDERS.map((p) => [p.id, p]));

export function getProvider(id: ProviderId): Provider {
  const p = BY_ID.get(id);
  if (!p) throw new Error(`Unknown provider: ${id}`);
  return p;
}

export function isProviderId(s: string): s is ProviderId {
  return BY_ID.has(s as ProviderId);
}
