import { isProviderId, PROVIDERS } from "../providers/registry";
import type { ProviderId } from "../providers/types";

export const ALL_PROVIDERS: readonly ProviderId[] = PROVIDERS.map((p) => p.id);

/** Comma-separated `?p=otomoto,olx` encoder. */
export function encodeProviderSet(set: readonly ProviderId[]): string {
  // Stable order matches the registry order so URLs are canonical.
  const ordered = ALL_PROVIDERS.filter((id) => set.includes(id));
  return ordered.join(",");
}

export function decodeProviderSet(raw: string | null): ProviderId[] | null {
  if (!raw) return null;
  const out: ProviderId[] = [];
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (id && isProviderId(id) && !out.includes(id)) out.push(id);
  }
  return out.length ? out : null;
}
