<script lang="ts">
	import type { ByModelResult, ModelBucket } from "$lib/aggregations/types";
	import { formatInt, formatMoney, formatRange, formatKm } from "./format";

	let {
		result,
		onSelect,
	}: {
		result: ByModelResult;
		onSelect: (bucket: ModelBucket) => void;
	} = $props();
</script>

<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
	{#each result.models as m (m.make + "/" + m.model)}
		<button
			type="button"
			onclick={() => onSelect(m)}
			class="group flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
		>
			<div class="aspect-[4/3] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
				{#if m.sampleThumbnail}
					<img
						src={m.sampleThumbnail}
						alt={`${m.makeDisplay} ${m.modelDisplay}`}
						loading="lazy"
						class="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
					/>
				{:else}
					<div class="flex h-full w-full items-center justify-center text-xs text-neutral-400">
						no photo
					</div>
				{/if}
			</div>
			<div class="flex flex-col gap-1 p-3">
				<div class="flex items-start justify-between gap-2">
					<h3 class="font-semibold leading-tight">
						{m.makeDisplay} <span class="text-neutral-600 dark:text-neutral-400">{m.modelDisplay}</span>
					</h3>
					<span class="shrink-0 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
						{formatInt(m.count)}
					</span>
				</div>
				<dl class="mt-1 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-xs text-neutral-600 dark:text-neutral-400">
					<dt>Price</dt>
					<dd class="truncate text-neutral-900 dark:text-neutral-100">
						{formatRange(m.priceRange, (n) => formatMoney(n, m.offers[0]?.priceCurrency ?? null))}
					</dd>
					<dt>Years</dt>
					<dd class="truncate text-neutral-900 dark:text-neutral-100">
						{formatRange(m.yearRange, (n) => String(n))}
					</dd>
					<dt>Mileage</dt>
					<dd class="truncate text-neutral-900 dark:text-neutral-100">
						{formatRange(m.mileageRange, formatKm)}
					</dd>
				</dl>
			</div>
		</button>
	{/each}
</div>
{#if result.offersWithoutModel > 0}
	<p class="mt-3 text-xs text-neutral-500">
		{result.offersWithoutModel} offer(s) were missing model/make metadata.
	</p>
{/if}
