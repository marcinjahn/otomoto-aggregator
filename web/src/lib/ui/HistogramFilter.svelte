<script lang="ts">
	import type { HistogramResult } from "$lib/aggregations/types";
	import type { NumericRange } from "$lib/filters/types";
	import { rangesEqual } from "$lib/filters/apply";
	import { formatInt } from "./format";

	let {
		result,
		selected,
		onToggle,
	}: {
		result: HistogramResult;
		selected: NumericRange[];
		onToggle: (r: NumericRange) => void;
	} = $props();

	const max = $derived(
		result.buckets.reduce((m, b) => (b.count > m ? b.count : m), 0)
	);

	function isSelected(low: number, high: number): boolean {
		return selected.some((s) =>
			rangesEqual(s, { lowInclusive: low, highExclusive: high })
		);
	}
</script>

<div class="flex flex-col gap-1">
	{#each result.buckets as b (b.lowInclusive)}
		{@const pct = max > 0 ? (b.count / max) * 100 : 0}
		{@const sel = isSelected(b.lowInclusive, b.highExclusive)}
		<button
			type="button"
			onclick={() =>
				onToggle({
					lowInclusive: b.lowInclusive,
					highExclusive: b.highExclusive,
				})}
			disabled={b.count === 0}
			class="grid grid-cols-[8rem_1fr_2.5rem] items-center gap-2 rounded px-1 py-0.5 text-left text-xs transition hover:bg-neutral-100 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-neutral-800"
			class:bg-blue-100={sel}
			class:dark:bg-blue-900={sel}
		>
			<span class="truncate text-neutral-600 dark:text-neutral-400">{b.label}</span>
			<div class="h-3 rounded bg-neutral-200 dark:bg-neutral-800">
				<div
					class="h-3 rounded transition-all"
					class:bg-blue-500={!sel}
					class:bg-blue-600={sel}
					style="width: {pct}%"
				></div>
			</div>
			<span class="text-right tabular-nums">{formatInt(b.count)}</span>
		</button>
	{/each}
</div>
{#if result.totalMissing > 0}
	<p class="mt-2 text-xs text-neutral-500">
		{result.totalMissing} offer(s) had no value.
	</p>
{/if}
