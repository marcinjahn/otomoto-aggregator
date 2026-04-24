<script lang="ts">
	import type { ByModelResult, ModelBucket } from "$lib/aggregations/types";
	import type { ModelKey } from "$lib/filters/types";
	import { modelKey } from "$lib/filters/types";
	import { formatInt, formatMoney, formatRange } from "./format";
	import { resizeOtomotoImage } from "./image";
	import ModelPhoto from "./ModelPhoto.svelte";

	let {
		result,
		selected,
		onToggle,
	}: {
		result: ByModelResult;
		selected: Set<ModelKey>;
		onToggle: (k: ModelKey) => void;
	} = $props();

	interface MakeGroup {
		make: string;
		makeDisplay: string;
		models: ModelBucket[];
	}

	const groups: MakeGroup[] = $derived.by(() => {
		const byMake = new Map<string, MakeGroup>();
		for (const m of result.models) {
			const g = byMake.get(m.make);
			if (g) g.models.push(m);
			else
				byMake.set(m.make, {
					make: m.make,
					makeDisplay: m.makeDisplay,
					models: [m],
				});
		}
		const arr = [...byMake.values()];
		arr.sort((a, b) =>
			a.makeDisplay.localeCompare(b.makeDisplay, undefined, {
				sensitivity: "base",
			})
		);
		for (const g of arr) {
			g.models.sort((a, b) =>
				a.modelDisplay.localeCompare(b.modelDisplay, undefined, {
					sensitivity: "base",
				})
			);
		}
		return arr;
	});
</script>

<div class="flex flex-col gap-3">
	{#each groups as g (g.make)}
		<div>
			<h4 class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
				{g.makeDisplay}
			</h4>
			<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
				{#each g.models as m (m.model)}
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
								fallback={resizeOtomotoImage(m.sampleThumbnail, "800x600")}
								alt={`${m.makeDisplay} ${m.modelDisplay}`}
							/>
						</div>
						<div class="flex flex-col gap-0.5 p-2">
							<div class="flex items-start justify-between gap-2">
								<h3 class="text-sm font-semibold leading-tight">
									<span class="text-neutral-600 dark:text-neutral-400">
										{m.modelDisplay}
									</span>
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
								{formatRange(m.priceRange, (n) =>
									formatMoney(n, m.offers[0]?.priceCurrency ?? null)
								)}
							</p>
							<p class="truncate text-[11px] text-neutral-500">
								{formatRange(m.yearRange, (n) => String(n))}
							</p>
						</div>
					</button>
				{/each}
			</div>
		</div>
	{/each}
</div>
{#if result.offersWithoutModel > 0}
	<p class="mt-2 text-xs text-neutral-500">
		{result.offersWithoutModel} offer(s) were missing model metadata.
	</p>
{/if}
