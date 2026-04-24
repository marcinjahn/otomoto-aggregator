<script lang="ts">
	import type { Offer } from "$lib/scraper/types";
	import { formatInt, formatKm, formatMoney } from "./format";

	let {
		offers,
		totalUnfiltered,
	}: {
		offers: Offer[];
		totalUnfiltered: number;
	} = $props();

	type SortKey =
		| "price-asc"
		| "price-desc"
		| "year-desc"
		| "year-asc"
		| "mileage-asc"
		| "newest";

	let sort = $state<SortKey>("price-asc");

	function cmpNum(a: number | null, b: number | null, dir: 1 | -1): number {
		const av = a ?? (dir === 1 ? Infinity : -Infinity);
		const bv = b ?? (dir === 1 ? Infinity : -Infinity);
		return dir === 1 ? av - bv : bv - av;
	}

	const sorted = $derived.by(() => {
		const copy = [...offers];
		switch (sort) {
			case "price-asc":
				return copy.sort((a, b) => cmpNum(a.priceAmount, b.priceAmount, 1));
			case "price-desc":
				return copy.sort((a, b) => cmpNum(a.priceAmount, b.priceAmount, -1));
			case "year-desc":
				return copy.sort((a, b) => cmpNum(a.year, b.year, -1));
			case "year-asc":
				return copy.sort((a, b) => cmpNum(a.year, b.year, 1));
			case "mileage-asc":
				return copy.sort((a, b) => cmpNum(a.mileageKm, b.mileageKm, 1));
			case "newest":
				return copy.sort((a, b) =>
					(b.createdAt ?? "").localeCompare(a.createdAt ?? "")
				);
		}
	});
</script>

<div class="flex flex-col">
	<div class="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-neutral-200 bg-white/90 px-3 py-2 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
		<p class="text-sm text-neutral-600 dark:text-neutral-400">
			<span class="font-semibold text-neutral-900 dark:text-neutral-100">
				{formatInt(offers.length)}
			</span>
			/ {formatInt(totalUnfiltered)} offers
		</p>
		<label class="flex items-center gap-2 text-xs">
			<span class="text-neutral-500">Sort by</span>
			<select
				bind:value={sort}
				class="rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800"
			>
				<option value="price-asc">Price ↑</option>
				<option value="price-desc">Price ↓</option>
				<option value="year-desc">Year (newest)</option>
				<option value="year-asc">Year (oldest)</option>
				<option value="mileage-asc">Mileage (lowest)</option>
				<option value="newest">Recently listed</option>
			</select>
		</label>
	</div>
	<ul class="divide-y divide-neutral-200 dark:divide-neutral-800">
		{#each sorted as o (o.id)}
			<li>
				<a
					href={o.url}
					target="_blank"
					rel="noopener noreferrer"
					class="flex gap-3 p-3 transition hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
				>
					<div class="h-20 w-28 shrink-0 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800">
						{#if o.thumbnailLarge ?? o.thumbnailSmall}
							<img
								src={o.thumbnailLarge ?? o.thumbnailSmall!}
								alt={o.title}
								loading="lazy"
								class="h-full w-full object-cover"
							/>
						{/if}
					</div>
					<div class="min-w-0 flex-1">
						<div class="flex items-start justify-between gap-3">
							<h3 class="truncate text-sm font-medium">{o.title}</h3>
							<span class="shrink-0 text-sm font-semibold tabular-nums">
								{formatMoney(o.priceAmount, o.priceCurrency)}
							</span>
						</div>
						<p class="truncate text-xs text-neutral-600 dark:text-neutral-400">
							{o.shortDescription ?? ""}
						</p>
						<dl class="mt-0.5 flex flex-wrap gap-x-3 gap-y-0 text-[11px] text-neutral-500">
							{#if o.year}<span>{o.year}</span>{/if}
							{#if o.mileageKm != null}<span>{formatKm(o.mileageKm)}</span>{/if}
							{#if o.fuelTypeDisplay}<span>{o.fuelTypeDisplay}</span>{/if}
							{#if o.gearboxDisplay}<span>{o.gearboxDisplay}</span>{/if}
							{#if o.enginePowerHp}<span>{o.enginePowerHp} KM</span>{/if}
							{#if o.city}<span>{o.city}{o.region ? `, ${o.region}` : ""}</span>{/if}
						</dl>
					</div>
				</a>
			</li>
		{:else}
			<li class="p-8 text-center text-sm text-neutral-500">
				No offers match the current filters.
			</li>
		{/each}
	</ul>
</div>
