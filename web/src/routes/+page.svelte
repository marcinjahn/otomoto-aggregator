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
		bySource,
	} from "$lib/aggregations";
	import type { FilterState, NumericRange } from "$lib/filters/types";
	import {
		emptyFilters,
		generationKey,
		hasAnyFilter,
		modelKey,
		NO_GEN_CODE,
	} from "$lib/filters/types";
	import {
		applyFilters,
		removeFromSet,
		toggleRange,
		toggleSet,
	} from "$lib/filters/apply";
	import { PROXY_URL } from "$lib/config";
	import {
		runSearch,
		type ProviderProgressEntry,
	} from "$lib/search/orchestrator";
	import {
		decodeProviderSet,
		encodeProviderSet,
	} from "$lib/search/provider-set";
	import { getProvider, PROVIDERS } from "$lib/providers/registry";
	import type { ProviderId } from "$lib/providers/types";
	import type { Offer } from "$lib/scraper/types";
	import CategoricalFilter from "$lib/ui/CategoricalFilter.svelte";
	import FilterSection from "$lib/ui/FilterSection.svelte";
	import HistogramFilter from "$lib/ui/HistogramFilter.svelte";
	import ModelFilter from "$lib/ui/ModelFilter.svelte";
	import OffersList from "$lib/ui/OffersList.svelte";
	import PriceSummary from "$lib/ui/PriceSummary.svelte";
	import ProviderToggle from "$lib/ui/ProviderToggle.svelte";
	import SearchForm from "$lib/ui/SearchForm.svelte";
	import ThemeSwitch from "$lib/ui/ThemeSwitch.svelte";
	import {
		buildOtomotoUrl,
		parseOtomotoUrl,
	} from "$lib/providers/otomoto/build-url";
	import { emptyForm, type SearchFormState } from "$lib/form/types";
	import { appliedFilterChips } from "$lib/form/applied-chips";
	import { filterLabel } from "$lib/filter-compat/resolver";
	import { replaceState } from "$app/navigation";
	import { page } from "$app/state";

	// Landing on a shared link pre-populates the filter form but does NOT
	// auto-scrape — the user can tweak before submitting. Parse synchronously so
	// SearchForm sees the populated state on its first mount (its internal state
	// is seeded from `initial` once and does not react to later prop changes).
	const initialFormState: SearchFormState = (() => {
		const q = page.url.searchParams.get("q");
		return q ? parseOtomotoUrl(q) : emptyForm();
	})();

	// Provider set defaults:
	//   - explicit ?p= → respect it
	//   - otherwise → all providers on
	const initialProviders: ProviderId[] = (() => {
		const explicit = decodeProviderSet(page.url.searchParams.get("p"));
		if (explicit) return explicit;
		return PROVIDERS.map((p) => p.id);
	})();

	let url = $state("");
	let running = $state(false);
	let enriching = $state(false);
	let error = $state<string | null>(null);
	let providerProgress = $state<ProviderProgressEntry[]>([]);
	let enrichProgressByProvider = $state<
		Record<string, { enriched: number; total: number; failed: number }>
	>({});
	let offers = $state<Offer[] | null>(null);
	let filters = $state<FilterState>(emptyFilters());
	let mobileFiltersOpen = $state(false);
	let showUrlFallback = $state(false);
	let formState = $state<SearchFormState>(initialFormState);
	let activeProviders = $state<ProviderId[]>(initialProviders);
	/** Provider set used for the *current* (or most recent) search — controls Zobacz na… buttons. */
	let searchProviders = $state<ProviderId[]>([]);
	let searchFormSnapshot = $state<SearchFormState | null>(null);
	let controller: AbortController | null = null;
	let showScrollTop = $state(false);

	$effect(() => {
		const onScroll = () => {
			showScrollTop = window.scrollY > 600;
		};
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	});

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: "smooth" });
	}

	function syncPageUrl(targetUrl: string | null, providers = activeProviders) {
		if (typeof window === "undefined") return;
		const u = new URL(page.url);
		if (targetUrl) u.searchParams.set("q", targetUrl);
		else u.searchParams.delete("q");
		const allProviders = PROVIDERS.length;
		if (providers.length > 0 && providers.length < allProviders) {
			u.searchParams.set("p", encodeProviderSet(providers));
		} else {
			u.searchParams.delete("p");
		}
		replaceState(u, page.state);
	}

	function setActiveProviders(next: ProviderId[]) {
		activeProviders = next;
		syncPageUrl(buildOtomotoUrl(formState), next);
	}

	const activeFilterCount = $derived(
		filters.models.size +
			filters.generations.size +
			filters.makes.size +
			filters.fuelTypes.size +
			filters.gearboxes.size +
			filters.regions.size +
			filters.sources.size +
			filters.priceRanges.length +
			filters.yearRanges.length +
			filters.mileageRanges.length
	);

	const canSubmit = $derived(url.trim().length > 0 && !running && !!PROXY_URL);
	const canSearch = $derived(!running && !enriching && !!PROXY_URL);

	// Filter ids that only otomoto can honor *given the current active provider set*.
	// When olx is off, no marks. When olx is on, every filter id in olx's
	// unsupportedFilters becomes "otomoto only".
	const otomotoOnlyFilters = $derived.by(() => {
		const otherProviders = PROVIDERS.filter(
			(p) => activeProviders.includes(p.id) && p.id !== "otomoto",
		);
		if (otherProviders.length === 0) return new Set<string>();
		const all = new Set<string>();
		for (const p of otherProviders) {
			for (const id of p.unsupportedFilters) all.add(id);
		}
		return all;
	});

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
					bySource: bySource.compute(offers),
				}
			: null
	);

	const filtered = $derived(offers ? applyFilters(offers, filters) : []);
	const summary = $derived(priceOverall.compute(filtered));

	const searchChips = $derived(appliedFilterChips(formState));

	// If the user post-filters by a specific generation, count olx offers
	// dropped purely because they have no generation data. Disclosure note
	// surfaces this so they understand why their olx count fell.
	const hiddenOlxByGenerationFilter = $derived.by(() => {
		if (!offers || filters.generations.size === 0) return 0;
		let n = 0;
		for (const o of offers) {
			if (o.source !== "olx") continue;
			if (o.generationCode != null) continue;
			if (!o.make || !o.model) continue;
			const gk = generationKey(o.make, o.model, NO_GEN_CODE);
			// Hidden iff its NO_GEN key is not in the active generation selection
			// AND the model isn't whole-selected.
			const mk = modelKey(o.make, o.model);
			if (filters.models.has(mk)) continue;
			if (!filters.generations.has(gk)) n++;
		}
		return n;
	});

	// Aggregated dropped-filter set across active providers (each provider's
	// resolver result is captured as `entry.dropped`). For the banner.
	const droppedFiltersByProvider = $derived(
		providerProgress
			.filter((p) => p.dropped.length > 0)
			.map((p) => ({
				id: p.id,
				label: p.label,
				dropped: p.dropped,
			})),
	);

	async function runUrl(e: Event) {
		e.preventDefault();
		if (!canSubmit) return;
		const target = url.trim();
		// The fallback input is otomoto-only; reuse parseOtomotoUrl to seed form.
		formState = parseOtomotoUrl(target);
		await runWith();
	}

	async function runWith() {
		if (!PROXY_URL || running) return;
		const targetUrl = buildOtomotoUrl(formState);
		syncPageUrl(targetUrl);
		searchProviders = [...activeProviders];
		searchFormSnapshot = formState;
		running = true;
		enriching = false;
		error = null;
		offers = [];
		filters = emptyFilters();
		providerProgress = activeProviders.map((id) => {
			const p = getProvider(id);
			return {
				id,
				label: p.label,
				done: false,
				pagesCompleted: 0,
				totalPages: 0,
				offersCollected: 0,
				totalOffers: 0,
				error: null,
				dropped: [],
			};
		});
		enrichProgressByProvider = {};
		controller = new AbortController();
		try {
			await runSearch({
				proxyUrl: PROXY_URL!,
				signal: controller.signal,
				providers: activeProviders.map((id) => getProvider(id)),
				form: formState,
				onProgress: (entries) => (providerProgress = entries),
				onAppend: (batch) => {
					offers = offers ? [...offers, ...batch] : [...batch];
				},
				onReplace: (changes) => {
					if (!offers) return;
					const next = [...offers];
					for (const { index, offer } of changes) {
						if (index >= 0 && index < next.length) next[index] = offer;
					}
					offers = next;
				},
				onEnrichProgress: (providerId, p) => {
					enriching = p.enriched < p.total;
					enrichProgressByProvider = {
						...enrichProgressByProvider,
						[providerId]: p,
					};
				},
				onEnrichOffer: (offerId, fields) => {
					const arr = offers;
					if (!arr) return;
					const idx = arr.findIndex((o) => o.id === offerId);
					if (idx < 0) return;
					const next = [...arr];
					next[idx] = { ...arr[idx]!, ...fields };
					offers = next;
				},
			});
		} catch (e) {
			if ((e as Error).name !== "AbortError") {
				error = (e as Error).message;
			}
		} finally {
			running = false;
			// Enrichment continues asynchronously in the background; mark its
			// state from the latest progress snapshot.
			const stillEnriching = Object.values(enrichProgressByProvider).some(
				(p) => p.enriched < p.total,
			);
			enriching = stillEnriching;
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
		formState = chip.remove(formState);
		runWith();
	}

	function toggleModel(k: string) {
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
	function toggleSource(k: string) {
		filters = {
			...filters,
			sources: toggleSet(filters.sources, k as ProviderId),
		};
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
				Wybierz filtry i odkryj co oferuje rynek — bez wchodzenia na otomoto i olx.
			</p>
		</div>
		<div class="shrink-0 pt-1">
			<ThemeSwitch />
		</div>
	</header>

	{#if !offers && !running && !enriching}
		<ProviderToggle
			active={activeProviders}
			onChange={setActiveProviders}
		/>

		<SearchForm
			disabled={!canSearch}
			initial={formState}
			otomotoOnlyFilters={otomotoOnlyFilters}
			olxActive={activeProviders.includes("olx")}
			onChange={(u, s) => {
				formState = s;
				syncPageUrl(u);
			}}
			onSubmit={(u, s) => {
				formState = s;
				runWith();
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
					searchProviders = [];
					searchFormSnapshot = null;
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
					{enriching && !running ? "Zatrzymaj wzbogacanie" : "Anuluj"}
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

	{#if droppedFiltersByProvider.length > 0}
		<div class="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
			{#each droppedFiltersByProvider as p (p.id)}
				<div>
					<strong>{p.label}</strong> ignoruje filtry: {p.dropped.map((d) => d.label).join(", ")}.
				</div>
			{/each}
		</div>
	{/if}

	{#if running || providerProgress.some((p) => !p.done)}
		<div class="flex flex-col gap-2">
			{#each providerProgress as p (p.id)}
				{@const pct =
					p.totalPages > 0
						? (p.pagesCompleted / p.totalPages) * 100
						: 0}
				<div class="rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
					<div class="mb-1 flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
						<span>
							<strong>{p.label}</strong>
							{#if !p.error}
								· Strona {p.pagesCompleted} / {p.totalPages || "?"} · {p.offersCollected} ofert
							{/if}
						</span>
						<span>{p.error ? "" : `${pct.toFixed(0)}%`}</span>
					</div>
					{#if p.error}
						<div class="text-xs text-red-700 dark:text-red-300">
							Błąd: {p.error}
						</div>
					{:else}
						<div class="h-2 rounded bg-neutral-200 dark:bg-neutral-800">
							<div
								class="h-2 rounded bg-blue-500 transition-all"
								style="width: {pct}%"
							></div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	{#if enriching}
		{#each Object.entries(enrichProgressByProvider) as [providerId, ep] (providerId)}
			{#if ep.enriched < ep.total}
				{@const pct2 = ep.total > 0 ? (ep.enriched / ep.total) * 100 : 0}
				<div class="rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
					<div class="mb-1 flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
						<span>
							<strong>{getProvider(providerId as ProviderId).label}</strong> ·
							Pobieranie informacji o generacjach · {ep.enriched} / {ep.total}
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
		{/each}
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

				{#if agg.bySource.buckets.length > 1}
					<FilterSection
						title={bySource.title}
						active={filters.sources.size > 0}
						onClear={() => (filters = { ...filters, sources: new Set() })}
					>
						<CategoricalFilter
							result={agg.bySource}
							selected={filters.sources}
							onToggle={toggleSource}
						/>
					</FilterSection>
				{/if}

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

			<section class="flex min-w-0 flex-col gap-3">
				{#if hiddenOlxByGenerationFilter > 0}
					<div class="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
						{hiddenOlxByGenerationFilter} ofert z olx.pl ukryto — brak danych o generacji.
					</div>
				{/if}
				<div class="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
					<OffersList offers={filtered} totalUnfiltered={offers.length} />
				</div>
				{#if searchProviders.length > 0 && searchFormSnapshot}
					<div class="flex flex-wrap justify-center gap-2">
						{#each searchProviders as id (id)}
							{@const provider = getProvider(id)}
							{@const href = provider.resultsPageUrl(searchFormSnapshot)}
							<a
								{href}
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-2 rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
							>
								<span>Zobacz te wyniki na {provider.label}</span>
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4" aria-hidden="true">
									<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
									<path d="M15 3h6v6" />
									<path d="M10 14 21 3" />
								</svg>
							</a>
						{/each}
					</div>
				{/if}
			</section>
		</div>
	{/if}
</div>

{#if showScrollTop}
	<button
		type="button"
		onclick={scrollToTop}
		aria-label="Przewiń do góry"
		title="Przewiń do góry"
		class="fixed bottom-4 right-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 shadow-lg transition hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
	>
		<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5" aria-hidden="true">
			<path d="m18 15-6-6-6 6" />
		</svg>
	</button>
{/if}
