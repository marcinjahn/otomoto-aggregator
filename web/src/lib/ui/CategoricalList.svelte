<script lang="ts">
	import type { CategoricalResult } from "$lib/aggregations/types";
	import { formatInt } from "./format";

	let {
		result,
		limit = 12,
	}: { result: CategoricalResult; limit?: number } = $props();

	const visible = $derived(result.buckets.slice(0, limit));
	const hidden = $derived(Math.max(0, result.buckets.length - visible.length));
</script>

<div class="flex flex-col gap-1">
	{#each visible as b (b.key)}
		<div class="grid grid-cols-[1fr_3rem_3rem] items-center gap-2 text-sm">
			<span class="truncate">{b.display}</span>
			<span class="text-right tabular-nums text-neutral-500">
				{(b.share * 100).toFixed(0)}%
			</span>
			<span class="text-right tabular-nums font-medium">{formatInt(b.count)}</span>
		</div>
	{/each}
	{#if hidden > 0}
		<p class="mt-1 text-xs text-neutral-500">+{hidden} more…</p>
	{/if}
</div>
