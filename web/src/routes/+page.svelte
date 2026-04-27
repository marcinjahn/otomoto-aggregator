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
	import {
		emptyFilters,
		generationKey,
		hasAnyFilter,
		modelKey,
	} from "$lib/filters/types";
	import {
		applyFilters,
		removeFromSet,
		toggleRange,
		toggleSet,
	} from "$lib/filters/apply";
	import { PROXY_URL } from "$lib/config";
	import {
		enrichAll,
		scrape,
		type EnrichProgress,
		type Offer,
		type ScrapeProgress,
	} from "$lib/scraper";
	import CategoricalFilter from "$lib/ui/CategoricalFilter.svelte";
	import FilterSection from "$lib/ui/FilterSection.svelte";
	import HistogramFilter from "$lib/ui/HistogramFilter.svelte";
	import ModelFilter from "$lib/ui/ModelFilter.svelte";
	import OffersList from "$lib/ui/OffersList.svelte";
	import PriceSummary from "$lib/ui/PriceSummary.svelte";
	import SearchForm from "$lib/ui/SearchForm.svelte";
	import ThemeSwitch from "$lib/ui/ThemeSwitch.svelte";
	import {
		buildOtomotoUrl,
		parseOtomotoUrl,
	} from "$lib/otomoto-filters/build-url";
	import { emptyForm, type SearchFormState } from "$lib/otomoto-filters/types";
	import { appliedFilterChips } from "$lib/otomoto-filters/applied-chips";
	import { replaceState } from "$app/navigation";
	import { page } from "$app/state";
	import { onMount } from "svelte";

	let url = $state("");
	let running = $state(false);
	let enriching = $state(false);
	let error = $state<string | null>(null);
	let progress = $state<ScrapeProgress | null>(null);
	let enrichProgress = $state<EnrichProgress | null>(null);
	let offers = $state<Offer[] | null>(null);
	let filters = $state<FilterState>(emptyFilters());
	let mobileFiltersOpen = $state(false);
	let showUrlFallback = $state(false);
	let formState = $state<SearchFormState>(emptyForm());
	let controller: AbortController | null = null;

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const q = params.get("q");
		if (!q) return;
		// Landing on a shared link pre-populates the filter form but does NOT
		// auto-scrape — the user can tweak before submitting.
		formState = parseOtomotoUrl(q);
	});

	function syncPageUrl(targetUrl: string | null) {
		if (typeof window === "undefined") return;
		const u = new URL(page.url);
		if (targetUrl) u.searchParams.set("q", targetUrl);
		else u.searchParams.delete("q");
		replaceState(u, page.state);
	}

	const activeFilterCount = $derived(
		filters.models.size +
			filters.generations.size +
			filters.makes.size +
			filters.fuelTypes.size +
			filters.gearboxes.size +
			filters.regions.size +
			filters.priceRanges.length +
			filters.yearRanges.length +
			filters.mileageRanges.length
	);

	const canSubmit = $derived(url.trim().length > 0 && !running && !!PROXY_URL);
	const canSearch = $derived(!running && !enriching && !!PROXY_URL);

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

	const searchChips = $derived(appliedFilterChips(formState));

	async function runUrl(e: Event) {
		e.preventDefault();
		if (!canSubmit) return;
		await runWith(url.trim());
	}

	async function runWith(targetUrl: string) {
		if (!PROXY_URL || running) return;
		syncPageUrl(targetUrl);
		running = true;
		enriching = false;
		error = null;
		progress = null;
		enrichProgress = null;
		offers = [];
		filters = emptyFilters();
		controller = new AbortController();
		try {
			const res = await scrape(targetUrl, {
				proxyUrl: PROXY_URL!,
				signal: controller.signal,
				onProgress: (p) => (progress = p),
				onBatch: (batch) => {
					// Stream offers into view as each page arrives.
					offers = offers ? [...offers, ...batch] : [...batch];
				},
			});
			offers = res.offers;
			running = false;
			if (res.offers.length > 0 && !controller.signal.aborted) {
				enriching = true;
				enrichProgress = { enriched: 0, total: res.offers.length, failed: 0 };
				await enrichAll(res.offers, {
					proxyUrl: PROXY_URL!,
					signal: controller.signal,
					onProgress: (p) => (enrichProgress = p),
					onOffer: (offerId, fields) => {
						// Mutate the offer in state so aggregations recompute reactively.
						const arr = offers;
						if (!arr) return;
						const idx = arr.findIndex((o) => o.id === offerId);
						if (idx < 0) return;
						const next = [...arr];
						next[idx] = { ...arr[idx]!, ...fields };
						offers = next;
					},
				});
			}
		} catch (e) {
			if ((e as Error).name !== "AbortError") {
				error = (e as Error).message;
			}
		} finally {
			running = false;
			enriching = false;
			controller = null;
		}
	}

	function cancel() {
		controller?.abort();
	}

	function clearFilters() {
		filters = emptyFilters();
	}

	function removeSearchChip(chip: ReturnType<typeof appliedFilterChips>[number]) {
		if (running || enriching) return;
		const next = chip.remove(formState);
		formState = next;
		runWith(buildOtomotoUrl(next));
	}

	function toggleModel(k: string) {
		// Clearing any per-generation selections for this model keeps the state
		// tidy when the user flips back to the whole-model view.
		const relatedGens = [...filters.generations].filter((g) =>
			g.startsWith(`${k}__`)
		);
		filters = {
			...filters,
			models: toggleSet(filters.models, k),
			generations: relatedGens.length
				? removeFromSet(filters.generations, relatedGens)
				: filters.generations,
		};
	}
	function toggleGeneration(make: string, model: string, genCode: string) {
		const mk = modelKey(make, model);
		const gk = generationKey(make, model, genCode);
		const nextModels = filters.models.has(mk)
			? removeFromSet(filters.models, [mk])
			: filters.models;
		filters = {
			...filters,
			models: nextModels,
			generations: toggleSet(filters.generations, gk),
		};
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

<div class="mx-auto flex w-full max-w-[1400px] flex-col gap-4 overflow-x-hidden px-3 py-6 sm:px-4">
	<header class="flex items-start justify-between gap-3">
		<div class="min-w-0">
			<h1 class="text-2xl font-bold tracking-tight">Otomoto Aggregator</h1>
			<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
				Wybierz filtry i odkryj co oferuje rynek — bez wchodzenia na otomoto.
			</p>
		</div>
		<div class="shrink-0 pt-1">
			<ThemeSwitch />
		</div>
	</header>

	{#if !offers && !running && !enriching}
		<SearchForm
			disabled={!canSearch}
			initial={formState}
			onChange={(u, s) => {
				formState = s;
				syncPageUrl(u);
			}}
			onSubmit={(u, s) => {
				formState = s;
				runWith(u);
			}}
		/>

		<details bind:open={showUrlFallback} class="rounded-md border border-dashed border-neutral-300 bg-white/60 p-3 text-sm dark:border-neutral-700 dark:bg-neutral-900/60">
			<summary class="cursor-pointer text-xs font-medium text-neutral-600 dark:text-neutral-400">
				Wklej URL z otomoto zamiast używać filtrów
			</summary>
			<form class="mt-3 flex flex-col gap-2 sm:flex-row" onsubmit={runUrl}>
				<input
					type="url"
					bind:value={url}
					placeholder="https://www.otomoto.pl/osobowe/..."
					class="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-neutral-700 dark:bg-neutral-900"
				/>
				<button
					type="submit"
					disabled={!canSubmit}
					class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm enabled:hover:bg-blue-500 disabled:opacity-50"
				>
					Szukaj
				</button>
			</form>
		</details>
	{:else}
		<div class="flex items-center justify-between gap-3">
			<button
				type="button"
				onclick={() => {
					cancel();
					offers = null;
					error = null;
				}}
				class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
			>
				← Nowe wyszukiwanie
			</button>
			{#if running || enriching}
				<button
					type="button"
					onclick={cancel}
					class="rounded-md bg-neutral-200 px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-100"
				>
					{enriching ? "Zatrzymaj wzbogacanie" : "Anuluj"}
				</button>
			{/if}
		</div>

		{#if searchChips.length > 0}
			<div class="flex flex-wrap items-center gap-1.5" aria-label="Zastosowane filtry">
				{#each searchChips as chip (chip.key)}
					<button
						type="button"
						onclick={() => removeSearchChip(chip)}
						disabled={running || enriching}
						aria-label="Usuń filtr: {chip.label}"
						title="Usuń filtr"
						class="inline-flex items-center gap-1.5 rounded-full border border-blue-500 bg-blue-600 px-3 py-1 text-xs font-medium text-white shadow-sm transition enabled:hover:bg-blue-500 disabled:opacity-60"
					>
						<span>{chip.label}</span>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="h-3 w-3" aria-hidden="true">
							<path d="M18 6 6 18" /><path d="m6 6 12 12" />
						</svg>
					</button>
				{/each}
			</div>
		{/if}
	{/if}

	{#if !PROXY_URL}
		<div class="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
			<strong>Proxy nie jest skonfigurowany.</strong> Ustaw <code>VITE_PROXY_URL</code> w
			<code>.env.local</code> (dev) lub w zmiennych GitHub Actions (produkcja) i zbuduj ponownie.
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
					Strona {progress.pagesCompleted} / {progress.totalPages} ·
					{progress.offersCollected} ofert
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

	{#if enriching && enrichProgress}
		{@const pct2 =
			enrichProgress.total > 0
				? (enrichProgress.enriched / enrichProgress.total) * 100
				: 0}
		<div class="rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
			<div class="mb-1 flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
				<span>
					Pobieranie informacji o generacjach · {enrichProgress.enriched} /
					{enrichProgress.total}
				</span>
				<span>{pct2.toFixed(0)}%</span>
			</div>
			<div class="h-1.5 rounded bg-neutral-200 dark:bg-neutral-800">
				<div
					class="h-1.5 rounded bg-emerald-500 transition-all"
					style="width: {pct2}%"
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
		<!-- Mobile-only filters trigger -->
		<div class="sticky top-0 z-20 -mx-3 flex items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50/95 px-3 py-2 backdrop-blur sm:-mx-4 sm:px-4 lg:hidden dark:border-neutral-800 dark:bg-neutral-950/95">
			<button
				type="button"
				onclick={() => (mobileFiltersOpen = true)}
				class="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium shadow-sm dark:border-neutral-700 dark:bg-neutral-900"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" aria-hidden="true">
					<path d="M3 6h18" /><path d="M6 12h12" /><path d="M10 18h4" />
				</svg>
				<span>Filtry</span>
				{#if activeFilterCount > 0}
					<span class="rounded-full bg-blue-600 px-1.5 text-xs font-semibold text-white">
						{activeFilterCount}
					</span>
				{/if}
			</button>
			<span class="text-xs text-neutral-500">
				{filtered.length} / {offers.length} ofert
			</span>
		</div>

		<div class="grid items-start gap-4 lg:grid-cols-[22rem_1fr]">
			<aside
				class={mobileFiltersOpen
					? "fixed inset-0 z-50 flex flex-col gap-3 overflow-y-auto bg-neutral-50 p-4 dark:bg-neutral-950 lg:static lg:z-auto lg:overflow-visible lg:bg-transparent lg:p-0"
					: "hidden flex-col gap-3 lg:static lg:flex lg:bg-transparent lg:p-0"}
			>
				<div class="flex items-center justify-between lg:hidden">
					<h2 class="text-base font-semibold">Filtry</h2>
					<button
						type="button"
						onclick={() => (mobileFiltersOpen = false)}
						class="rounded border border-neutral-300 bg-white px-3 py-1 text-sm font-medium dark:border-neutral-700 dark:bg-neutral-900"
					>
						Gotowe
					</button>
				</div>
				{#if hasAnyFilter(filters)}
					<button
						type="button"
						onclick={clearFilters}
						class="self-start rounded border border-neutral-300 bg-white px-3 py-1 text-xs font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
					>
						Wyczyść filtry
					</button>
				{/if}

				<section class="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
					<h2 class="mb-2 text-sm font-semibold">{priceOverall.title}</h2>
					<PriceSummary result={summary} />
				</section>

				<FilterSection
					title={byModel.title}
					active={filters.models.size > 0 || filters.generations.size > 0}
					onClear={() =>
						(filters = {
							...filters,
							models: new Set(),
							generations: new Set(),
						})}
					open
				>
					<ModelFilter
						result={agg.byModel}
						selectedModels={filters.models}
						selectedGenerations={filters.generations}
						onToggleModel={toggleModel}
						onToggleGeneration={toggleGeneration}
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
	{/if}
</div>
