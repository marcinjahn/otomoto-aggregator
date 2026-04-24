<script lang="ts">
	import type { CategoricalResult } from "$lib/aggregations/types";
	import { formatInt } from "./format";

	let {
		result,
		selected,
		onToggle,
		limit = 16,
	}: {
		result: CategoricalResult;
		selected: Set<string>;
		onToggle: (key: string) => void;
		limit?: number;
	} = $props();

	let showAll = $state(false);
	const visible = $derived(
		showAll ? result.buckets : result.buckets.slice(0, limit)
	);
	const hidden = $derived(Math.max(0, result.buckets.length - visible.length));
</script>

<div class="flex flex-col gap-0.5">
	{#each visible as b (b.key)}
		{@const sel = selected.has(b.key)}
		<button
			type="button"
			onclick={() => onToggle(b.key)}
			class="grid grid-cols-[1fr_2.5rem_2.5rem] items-center gap-2 rounded px-2 py-1 text-left text-sm transition hover:bg-neutral-100 dark:hover:bg-neutral-800"
			class:bg-blue-100={sel}
			class:dark:bg-blue-900={sel}
			class:font-semibold={sel}
		>
			<span class="truncate">{b.display}</span>
			<span class="text-right tabular-nums text-neutral-500">
				{(b.share * 100).toFixed(0)}%
			</span>
			<span class="text-right tabular-nums font-medium">{formatInt(b.count)}</span>
		</button>
	{/each}
	{#if hidden > 0 && !showAll}
		<button
			type="button"
			onclick={() => (showAll = true)}
			class="mt-1 self-start px-2 text-xs text-blue-600 hover:underline dark:text-blue-400"
		>
			+{hidden} more…
		</button>
	{:else if showAll && result.buckets.length > limit}
		<button
			type="button"
			onclick={() => (showAll = false)}
			class="mt-1 self-start px-2 text-xs text-neutral-500 hover:underline"
		>
			Show fewer
		</button>
	{/if}
</div>
