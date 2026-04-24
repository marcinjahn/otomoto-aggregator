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
	import type { ModelBucket } from "$lib/aggregations/types";
	import { PROXY_URL } from "$lib/config";
	import { scrape, type Offer, type ScrapeProgress } from "$lib/scraper";
	import ByModelGrid from "$lib/ui/ByModelGrid.svelte";
	import CategoricalList from "$lib/ui/CategoricalList.svelte";
	import HistogramBar from "$lib/ui/HistogramBar.svelte";
	import ModelDrilldown from "$lib/ui/ModelDrilldown.svelte";
	import PriceSummary from "$lib/ui/PriceSummary.svelte";

	let url = $state("");
	let running = $state(false);
	let error = $state<string | null>(null);
	let progress = $state<ScrapeProgress | null>(null);
	let offers = $state<Offer[] | null>(null);
	let selectedModel = $state<ModelBucket | null>(null);
	let controller: AbortController | null = null;

	const canSubmit = $derived(url.trim().length > 0 && !running && !!PROXY_URL);

	const results = $derived(
		offers
			? {
					priceOverall: priceOverall.compute(offers),
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

	async function run(e: Event) {
		e.preventDefault();
		if (!canSubmit) return;
		running = true;
		error = null;
		progress = null;
		offers = null;
		selectedModel = null;
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
</script>

<main class="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-8">
	<header>
		<h1 class="text-2xl font-bold tracking-tight">Otomoto Aggregator</h1>
		<p class="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
			Paste an Otomoto search URL and discover what's on offer.
		</p>
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
				Scrape
			</button>
		{/if}
	</form>

	{#if !PROXY_URL}
		<div class="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
			<strong>Proxy not configured.</strong> Set <code>VITE_PROXY_URL</code> in
			<code>.env.local</code> (dev) or as a GitHub Actions variable (production) and rebuild.
		</div>
	{/if}

	{#if progress}
		{@const pct =
			progress.totalPages > 0
				? (progress.page / progress.totalPages) * 100
				: 0}
		<div class="rounded-md border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
			<div class="mb-1 flex justify-between text-xs text-neutral-600 dark:text-neutral-400">
				<span>
					Page {progress.page} of {progress.totalPages} ·
					{progress.offersCollected} / {progress.totalOffers} offers
				</span>
				<span>{pct.toFixed(0)}%</span>
			</div>
			<div class="h-2 rounded bg-neutral-200 dark:bg-neutral-800">
				<div class="h-2 rounded bg-blue-500 transition-all" style="width: {pct}%"></div>
			</div>
		</div>
	{/if}

	{#if error}
		<div class="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
			{error}
		</div>
	{/if}

	{#if results}
		<section class="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
			<header>
				<h2 class="text-lg font-semibold">{priceOverall.title}</h2>
				<p class="text-xs text-neutral-500">{priceOverall.description}</p>
			</header>
			<PriceSummary result={results.priceOverall} />
		</section>

		<section class="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
			<header>
				<h2 class="text-lg font-semibold">{byModel.title}</h2>
				<p class="text-xs text-neutral-500">{byModel.description}</p>
			</header>
			<ByModelGrid result={results.byModel} onSelect={(m) => (selectedModel = m)} />
		</section>

		<div class="grid gap-4 md:grid-cols-2">
			<section class="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
				<header>
					<h2 class="text-base font-semibold">{priceHistogram.title}</h2>
					<p class="text-xs text-neutral-500">{priceHistogram.description}</p>
				</header>
				<HistogramBar result={results.priceHist} />
			</section>

			<section class="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
				<header>
					<h2 class="text-base font-semibold">{yearHistogram.title}</h2>
					<p class="text-xs text-neutral-500">{yearHistogram.description}</p>
				</header>
				<HistogramBar result={results.yearHist} />
			</section>

			<section class="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
				<header>
					<h2 class="text-base font-semibold">{mileageHistogram.title}</h2>
					<p class="text-xs text-neutral-500">{mileageHistogram.description}</p>
				</header>
				<HistogramBar result={results.mileageHist} />
			</section>

			<section class="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
				<header>
					<h2 class="text-base font-semibold">{byMake.title}</h2>
					<p class="text-xs text-neutral-500">{byMake.description}</p>
				</header>
				<CategoricalList result={results.byMake} />
			</section>

			<section class="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
				<header>
					<h2 class="text-base font-semibold">{byFuelType.title}</h2>
					<p class="text-xs text-neutral-500">{byFuelType.description}</p>
				</header>
				<CategoricalList result={results.byFuel} />
			</section>

			<section class="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
				<header>
					<h2 class="text-base font-semibold">{byGearbox.title}</h2>
					<p class="text-xs text-neutral-500">{byGearbox.description}</p>
				</header>
				<CategoricalList result={results.byGearbox} />
			</section>

			<section class="flex flex-col gap-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 md:col-span-2">
				<header>
					<h2 class="text-base font-semibold">{byRegion.title}</h2>
					<p class="text-xs text-neutral-500">{byRegion.description}</p>
				</header>
				<CategoricalList result={results.byRegion} />
			</section>
		</div>
	{:else if !progress && !error}
		<section
			class="rounded-md border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700"
		>
			Paste an Otomoto search URL above and hit Scrape.
		</section>
	{/if}

	{#if selectedModel}
		<ModelDrilldown bucket={selectedModel} onClose={() => (selectedModel = null)} />
	{/if}
</main>
