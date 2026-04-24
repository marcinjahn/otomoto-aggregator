<script lang="ts">
	import {
		byModel,
		priceOverall,
		priceHistogram,
		yearHistogram,
		mileageHistogram,
		byMake,
		byFuelType,
		byGearbox,
		byRegion,
	} from "$lib/aggregations";
	import type { FilterState, NumericRange } from "$lib/filters/types";
	import { emptyFilters, hasAnyFilter } from "$lib/filters/types";
	import { applyFilters, toggleRange, toggleSet } from "$lib/filters/apply";
	import { PROXY_URL } from "$lib/config";
	import { scrape, type Offer, type ScrapeProgress } from "$lib/scraper";
	import CategoricalFilter from "$lib/ui/CategoricalFilter.svelte";
	import FilterSection from "$lib/ui/FilterSection.svelte";
	import HistogramFilter from "$lib/ui/HistogramFilter.svelte";
	import ModelFilter from "$lib/ui/ModelFilter.svelte";
	import OffersList from "$lib/ui/OffersList.svelte";
	import PriceSummary from "$lib/ui/PriceSummary.svelte";
	import ThemeSwitch from "$lib/ui/ThemeSwitch.svelte";

	let url = $state("");
	let running = $state(false);
	let error = $state<string | null>(null);
	let progress = $state<ScrapeProgress | null>(null);
	let offers = $state<Offer[] | null>(null);
	let filters = $state<FilterState>(emptyFilters());
	let controller: AbortController | null = null;

	const canSubmit = $derived(url.trim().length > 0 && !running && !!PROXY_URL);

	const agg = $derived(
		offers
			? {
					byModel: byModel.compute(offers),
					priceHist: priceHistogram.compute(offers),
					yearHist: yearHistogram.compute(offers),
					mileageHist: mileageHistogram.compute(offers),
					byMake: byMake.compute(offers),
					byFuel: byFuelType.compute(offers),
					byGearbox: byGearbox.compute(offers),
					byRegion: byRegion.compute(offers),
				}
			: null
	);

	const filtered = $derived(offers ? applyFilters(offers, filters) : []);
	const summary = $derived(priceOverall.compute(filtered));

	async function run(e: Event) {
		e.preventDefault();
		if (!canSubmit) return;
		running = true;
		error = null;
		progress = null;
		offers = null;
		filters = emptyFilters();
		controller = new AbortController();
		try {
			const res = await scrape(url.trim(), {
				proxyUrl: PROXY_URL!,
				signal: controller.signal,
				onProgress: (p) => (progress = p),
			});
			offers = res.offers;
		} catch (e) {
			if ((e as Error).name !== "AbortError") {
				error = (e as Error).message;
			}
		} finally {
			running = false;
			controller = null;
		}
	}

	function cancel() {
		controller?.abort();
	}

	function clearFilters() {
		filters = emptyFilters();
	}

	function toggleModel(k: string) {
		filters = { ...filters, models: toggleSet(filters.models, k) };
	}
	function toggleMake(k: string) {
		filters = { ...filters, makes: toggleSet(filters.makes, k) };
	}
	function toggleFuel(k: string) {
		filters = { ...filters, fuelTypes: toggleSet(filters.fuelTypes, k) };
	}
	function toggleGearbox(k: string) {
		filters = { ...filters, gearboxes: toggleSet(filters.gearboxes, k) };
	}
	function toggleRegion(k: string) {
		filters = { ...filters, regions: toggleSet(filters.regions, k) };
	}
	function togglePriceRange(r: NumericRange) {
		filters = { ...filters, priceRanges: toggleRange(filters.priceRanges, r) };
	}
	function toggleYearRange(r: NumericRange) {
		filters = { ...filters, yearRanges: toggleRange(filters.yearRanges, r) };
	}
	function toggleMileageRange(r: NumericRange) {
		filters = {
			...filters,
			mileageRanges: toggleRange(filters.mileageRanges, r),
		};
	}
</script>

<div class="mx-auto flex max-w-[1400px] flex-col gap-4 px-4 py-6">
	<header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Otomoto Aggregator</h1>
			<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
				Paste an Otomoto search URL and discover what's on offer.
			</p>
		</div>
		<ThemeSwitch />
	</header>

	<form class="flex flex-col gap-2 sm:flex-row" onsubmit={run}>
		<input
			type="url"
			bind:value={url}
			placeholder="https://www.otomoto.pl/osobowe/..."
			required
			class="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-900"
		/>
		{#if running}
			<button
				type="button"
				onclick={cancel}
				class="rounded-md bg-neutral-200 px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-100"
			>
				Cancel
			</button>
		{:else}
			<button
				type="submit"
				disabled={!canSubmit}
				class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm enabled:hover:bg-blue-500 disabled:opacity-50"
			>
				Discover
			</button>
		{/if}
	</form>

	{#if !PROXY_URL}
		<div class="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
			<strong>Proxy not configured.</strong> Set <code>VITE_PROXY_URL</code> in
			<code>.env.local</code> (dev) or as a GitHub Actions variable (production) and rebuild.
		</div>
	{/if}

	{#if running && progress}
		{@const pct =
			progress.totalPages > 0
				? (progress.pagesCompleted / progress.totalPages) * 100
				: 0}
		<div class="rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
			<div class="mb-1 flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
				<span>
					Page {progress.pagesCompleted} / {progress.totalPages} ·
					{progress.offersCollected} offers so far
				</span>
				<span>{pct.toFixed(0)}%</span>
			</div>
			<div class="h-2 rounded bg-neutral-200 dark:bg-neutral-800">
				<div
					class="h-2 rounded bg-blue-500 transition-all"
					style="width: {pct}%"
				></div>
			</div>
		</div>
	{/if}

	{#if error}
		<div class="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
			{error}
		</div>
	{/if}

	{#if agg && offers}
		<div class="grid items-start gap-4 lg:grid-cols-[22rem_1fr]">
			<aside class="flex flex-col gap-3">
				{#if hasAnyFilter(filters)}
					<button
						type="button"
						onclick={clearFilters}
						class="self-start rounded border border-neutral-300 bg-white px-3 py-1 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
					>
						Clear all filters
					</button>
				{/if}

				<section class="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
					<h2 class="mb-2 text-sm font-semibold">{priceOverall.title}</h2>
					<PriceSummary result={summary} />
				</section>

				<FilterSection
					title={byModel.title}
					active={filters.models.size > 0}
					onClear={() => (filters = { ...filters, models: new Set() })}
					open
				>
					<ModelFilter
						result={agg.byModel}
						selected={filters.models}
						onToggle={toggleModel}
					/>
				</FilterSection>

				<FilterSection
					title={yearHistogram.title}
					active={filters.yearRanges.length > 0}
					onClear={() => (filters = { ...filters, yearRanges: [] })}
					open
				>
					<HistogramFilter
						result={agg.yearHist}
						selected={filters.yearRanges}
						onToggle={toggleYearRange}
					/>
				</FilterSection>

				<FilterSection
					title={priceHistogram.title}
					active={filters.priceRanges.length > 0}
					onClear={() => (filters = { ...filters, priceRanges: [] })}
				>
					<HistogramFilter
						result={agg.priceHist}
						selected={filters.priceRanges}
						onToggle={togglePriceRange}
					/>
				</FilterSection>

				<FilterSection
					title={mileageHistogram.title}
					active={filters.mileageRanges.length > 0}
					onClear={() => (filters = { ...filters, mileageRanges: [] })}
				>
					<HistogramFilter
						result={agg.mileageHist}
						selected={filters.mileageRanges}
						onToggle={toggleMileageRange}
					/>
				</FilterSection>

				<FilterSection
					title={byMake.title}
					active={filters.makes.size > 0}
					onClear={() => (filters = { ...filters, makes: new Set() })}
				>
					<CategoricalFilter
						result={agg.byMake}
						selected={filters.makes}
						onToggle={toggleMake}
					/>
				</FilterSection>

				<FilterSection
					title={byFuelType.title}
					active={filters.fuelTypes.size > 0}
					onClear={() => (filters = { ...filters, fuelTypes: new Set() })}
				>
					<CategoricalFilter
						result={agg.byFuel}
						selected={filters.fuelTypes}
						onToggle={toggleFuel}
					/>
				</FilterSection>

				<FilterSection
					title={byGearbox.title}
					active={filters.gearboxes.size > 0}
					onClear={() => (filters = { ...filters, gearboxes: new Set() })}
				>
					<CategoricalFilter
						result={agg.byGearbox}
						selected={filters.gearboxes}
						onToggle={toggleGearbox}
					/>
				</FilterSection>

				<FilterSection
					title={byRegion.title}
					active={filters.regions.size > 0}
					onClear={() => (filters = { ...filters, regions: new Set() })}
				>
					<CategoricalFilter
						result={agg.byRegion}
						selected={filters.regions}
						onToggle={toggleRegion}
					/>
				</FilterSection>
			</aside>

			<section class="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
				<OffersList offers={filtered} totalUnfiltered={offers.length} />
			</section>
		</div>
	{:else if !running && !error}
		<section class="rounded-md border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
			Paste an Otomoto search URL above and hit Discover.
		</section>
	{/if}
</div>
