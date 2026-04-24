<script lang="ts">
	import type {
		ByModelResult,
		GenerationBucket,
		ModelBucket,
	} from "$lib/aggregations/types";
	import type { GenerationKey, ModelKey } from "$lib/filters/types";
	import { generationKey, modelKey } from "$lib/filters/types";
	import { formatInt, formatMoney, formatRange } from "./format";
	import { resizeOtomotoImage } from "./image";
	import ModelPhoto from "./ModelPhoto.svelte";

	let {
		result,
		selectedModels,
		selectedGenerations,
		onToggleModel,
		onToggleGeneration,
	}: {
		result: ByModelResult;
		selectedModels: Set<ModelKey>;
		selectedGenerations: Set<GenerationKey>;
		onToggleModel: (k: ModelKey) => void;
		onToggleGeneration: (make: string, model: string, genCode: string) => void;
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

	function isGenSelected(
		make: string,
		model: string,
		g: GenerationBucket
	): boolean {
		return selectedGenerations.has(generationKey(make, model, g.code));
	}
</script>

<div class="flex flex-col gap-5">
	{#each groups as g (g.make)}
		<div>
			<h4 class="mb-2 border-b border-neutral-200 pb-1 text-sm font-bold text-neutral-900 dark:border-neutral-700 dark:text-neutral-100">
				{g.makeDisplay}
			</h4>
			<div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
				{#each g.models as m (m.model)}
					{@const mk = modelKey(m.make, m.model)}
					{@const wholeSelected = selectedModels.has(mk)}
					{@const showGens = m.generations.length > 1}
					<div
						class="flex flex-col overflow-hidden rounded-md border shadow-sm transition"
						class:border-blue-500={wholeSelected}
						class:ring-2={wholeSelected}
						class:ring-blue-500={wholeSelected}
						class:border-neutral-200={!wholeSelected}
						class:bg-white={!wholeSelected}
						class:bg-blue-50={wholeSelected}
						class:dark:border-neutral-800={!wholeSelected}
						class:dark:bg-neutral-900={!wholeSelected}
						class:dark:border-blue-400={wholeSelected}
						class:dark:bg-blue-950={wholeSelected}
					>
						<button
							type="button"
							onclick={() => onToggleModel(mk)}
							class="group flex flex-col overflow-hidden text-left transition hover:-translate-y-0.5 hover:shadow-md"
						>
							<div class="aspect-[4/3] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
								<ModelPhoto
									make={m.makeDisplay ?? m.make}
									model={m.modelDisplay ?? m.model}
									year={m.yearMedian != null ? Math.round(m.yearMedian) : null}
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
										class:bg-blue-600={wholeSelected}
										class:text-white={wholeSelected}
										class:bg-blue-100={!wholeSelected}
										class:text-blue-800={!wholeSelected}
										class:dark:bg-blue-900={!wholeSelected}
										class:dark:text-blue-300={!wholeSelected}
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
						{#if showGens}
							<div class="flex flex-col gap-0.5 border-t border-neutral-200 bg-neutral-50 p-1.5 dark:border-neutral-800 dark:bg-neutral-950/40">
								{#each m.generations as gen (gen.code)}
									{@const sel = isGenSelected(m.make, m.model, gen)}
									<button
										type="button"
										onclick={() =>
											onToggleGeneration(m.make, m.model, gen.code)}
										class="flex items-center justify-between gap-2 rounded px-1.5 py-0.5 text-left text-[11px] transition"
										class:bg-blue-600={sel}
										class:text-white={sel}
										class:hover:bg-neutral-200={!sel}
										class:dark:hover:bg-neutral-800={!sel}
									>
										<span class="truncate">{gen.display}</span>
										<span class="shrink-0 tabular-nums" class:text-neutral-500={!sel}>
											{formatInt(gen.count)}
										</span>
									</button>
								{/each}
							</div>
						{/if}
					</div>
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
