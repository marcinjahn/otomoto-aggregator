<script lang="ts">
	import type { HistogramResult } from "$lib/aggregations/types";
	import { formatInt } from "./format";

	let { result }: { result: HistogramResult } = $props();

	const max = $derived(
		result.buckets.reduce((m, b) => (b.count > m ? b.count : m), 0)
	);
</script>

<div class="flex flex-col gap-1">
	{#each result.buckets as b (b.lowInclusive)}
		{@const pct = max > 0 ? (b.count / max) * 100 : 0}
		<div class="grid grid-cols-[10rem_1fr_3rem] items-center gap-2 text-xs">
			<span class="truncate text-neutral-600 dark:text-neutral-400">{b.label}</span>
			<div class="h-3 rounded bg-neutral-200 dark:bg-neutral-800">
				<div class="h-3 rounded bg-blue-500" style="width: {pct}%"></div>
			</div>
			<span class="text-right tabular-nums">{formatInt(b.count)}</span>
		</div>
	{/each}
</div>
{#if result.totalMissing > 0}
	<p class="mt-2 text-xs text-neutral-500">{result.totalMissing} offer(s) had no value.</p>
{/if}
