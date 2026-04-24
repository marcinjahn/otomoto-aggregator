<script lang="ts">
	import type { ByModelResult } from "$lib/aggregations/types";
	import type { ModelKey } from "$lib/filters/types";
	import { modelKey } from "$lib/filters/types";
	import { formatInt, formatMoney, formatRange } from "./format";
	import ModelPhoto from "./ModelPhoto.svelte";

	let {
		result,
		selected,
		onToggle,
		limit = 12,
	}: {
		result: ByModelResult;
		selected: Set<ModelKey>;
		onToggle: (k: ModelKey) => void;
		limit?: number;
	} = $props();

	let showAll = $state(false);
	const visible = $derived(
		showAll ? result.models : result.models.slice(0, limit)
	);
	const hidden = $derived(Math.max(0, result.models.length - visible.length));
</script>

<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
	{#each visible as m (m.make + "/" + m.model)}
		{@const key = modelKey(m.make, m.model)}
		{@const sel = selected.has(key)}
		<button
			type="button"
			onclick={() => onToggle(key)}
			class="group flex flex-col overflow-hidden rounded-md border text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
			class:border-blue-500={sel}
			class:ring-2={sel}
			class:ring-blue-500={sel}
			class:border-neutral-200={!sel}
			class:bg-white={!sel}
			class:bg-blue-50={sel}
			class:dark:border-neutral-800={!sel}
			class:dark:bg-neutral-900={!sel}
			class:dark:border-blue-400={sel}
			class:dark:bg-blue-950={sel}
		>
			<div class="aspect-[4/3] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
				<ModelPhoto
					make={m.makeDisplay ?? m.make}
					model={m.modelDisplay ?? m.model}
					fallback={m.sampleThumbnail}
					alt={`${m.makeDisplay} ${m.modelDisplay}`}
				/>
			</div>
			<div class="flex flex-col gap-0.5 p-2">
				<div class="flex items-start justify-between gap-2">
					<h3 class="text-sm font-semibold leading-tight">
						{m.makeDisplay}
						<span class="text-neutral-600 dark:text-neutral-400">{m.modelDisplay}</span>
					</h3>
					<span
						class="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
						class:bg-blue-600={sel}
						class:text-white={sel}
						class:bg-blue-100={!sel}
						class:text-blue-800={!sel}
						class:dark:bg-blue-900={!sel}
						class:dark:text-blue-300={!sel}
					>
						{formatInt(m.count)}
					</span>
				</div>
				<p class="truncate text-[11px] text-neutral-600 dark:text-neutral-400">
					{formatRange(m.priceRange, (n) => formatMoney(n, m.offers[0]?.priceCurrency ?? null))}
				</p>
				<p class="truncate text-[11px] text-neutral-500">
					{formatRange(m.yearRange, (n) => String(n))}
				</p>
			</div>
		</button>
	{/each}
</div>
{#if hidden > 0 && !showAll}
	<button
		type="button"
		onclick={() => (showAll = true)}
		class="mt-2 self-start px-2 text-xs text-blue-600 hover:underline dark:text-blue-400"
	>
		+{hidden} more models…
	</button>
{:else if showAll && result.models.length > limit}
	<button
		type="button"
		onclick={() => (showAll = false)}
		class="mt-2 self-start px-2 text-xs text-neutral-500 hover:underline"
	>
		Show fewer
	</button>
{/if}
{#if result.offersWithoutModel > 0}
	<p class="mt-2 text-xs text-neutral-500">
		{result.offersWithoutModel} offer(s) were missing model metadata.
	</p>
{/if}
