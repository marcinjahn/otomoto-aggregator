import type { Offer } from "../scraper/types";

/**
 * Cross-provider streaming dedup.
 *
 * Rule: an olx ad whose `otomotoTwinId` matches an otomoto offer in the set
 * is dropped (otomoto is canonical). When the otomoto offer arrives *after*
 * its olx twin, the olx record is replaced by the otomoto one in-place so
 * the merged ordering is stable.
 *
 * The function is order-independent: feeding offers in any sequence and
 * rolling the result into a new merged set produces the same final list.
 */
export function dedup(offers: readonly Offer[]): Offer[] {
  // First pass: collect every otomoto id we've seen.
  const otomotoIds = new Set<string>();
  for (const o of offers) {
    if (o.source === "otomoto") otomotoIds.add(o.id);
  }

  const out: Offer[] = [];
  for (const o of offers) {
    if (
      o.source === "olx" &&
      o.otomotoTwinId &&
      otomotoIds.has(o.otomotoTwinId)
    ) {
      continue;
    }
    out.push(o);
  }
  return out;
}

/**
 * Streaming-friendly merger. Maintains an internal index so newly arriving
 * batches can be reconciled with previously seen offers in O(1) per offer.
 *
 * `add(batch)` returns the *delta* that should be applied to the rendered
 * list:
 *   - `appended`: new offers to push to the bottom of the list (in order).
 *   - `replacedAt`: pairs of (current-list index, new offer) where a late
 *     otomoto arrival should overwrite an olx twin already shown.
 */
export class StreamingDedup {
  private list: Offer[] = [];
  private otomotoIndex = new Map<string, number>(); // otomoto id → index in list
  private byId = new Set<string>(); // dedup within-source

  /** Returns a snapshot of the current canonical list. */
  get offers(): readonly Offer[] {
    return this.list;
  }

  /**
   * Ingest a fresh batch from a single provider.
   * Returns:
   *   - `appended`: offers that should be appended in order
   *   - `replaced`: pairs of `[indexInList, replacementOffer]` to overwrite
   */
  add(batch: readonly Offer[]): {
    appended: Offer[];
    replaced: Array<{ index: number; offer: Offer }>;
  } {
    const appended: Offer[] = [];
    const replaced: Array<{ index: number; offer: Offer }> = [];

    for (const o of batch) {
      // Within-source dedup (defensive — providers already dedup their pages).
      if (this.byId.has(o.id)) continue;

      if (o.source === "otomoto") {
        // If we previously stored the olx twin, replace it in place.
        let replacedIdx = -1;
        for (let i = 0; i < this.list.length; i++) {
          const existing = this.list[i]!;
          if (
            existing.source === "olx" &&
            existing.otomotoTwinId &&
            existing.otomotoTwinId === o.id
          ) {
            replacedIdx = i;
            this.byId.delete(existing.id);
            break;
          }
        }
        if (replacedIdx >= 0) {
          this.list[replacedIdx] = o;
          replaced.push({ index: replacedIdx, offer: o });
        } else {
          this.list.push(o);
          appended.push(o);
        }
        this.otomotoIndex.set(o.id, this.list.length - 1);
        this.byId.add(o.id);
        continue;
      }

      // o.source === "olx"
      if (o.otomotoTwinId && this.otomotoIndex.has(o.otomotoTwinId)) {
        // The canonical otomoto offer is already in the list — drop the olx
        // duplicate entirely.
        continue;
      }
      this.list.push(o);
      this.byId.add(o.id);
      appended.push(o);
    }

    return { appended, replaced };
  }
}
