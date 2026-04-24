<script lang="ts">
	import type { ModelBucket } from "$lib/aggregations/types";
	import { formatInt, formatMoney, formatKm } from "./format";

	let {
		bucket,
		onClose,
	}: {
		bucket: ModelBucket;
		onClose: () => void;
	} = $props();

	type SortKey = "price-asc" | "price-desc" | "year-desc" | "mileage-asc";
	let sort = $state<SortKey>("price-asc");

	const sorted = $derived.by(() => {
		const copy = [...bucket.offers];
		switch (sort) {
			case "price-asc":
				return copy.sort((a, b) => (a.priceAmount ?? Infinity) - (b.priceAmount ?? Infinity));
			case "price-desc":
				return copy.sort((a, b) => (b.priceAmount ?? -Infinity) - (a.priceAmount ?? -Infinity));
			case "year-desc":
				return copy.sort((a, b) => (b.year ?? -Infinity) - (a.year ?? -Infinity));
			case "mileage-asc":
				return copy.sort((a, b) => (a.mileageKm ?? Infinity) - (b.mileageKm ?? Infinity));
		}
	});
</script>

<div
	role="dialog"
	aria-modal="true"
	tabindex="-1"
	class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-neutral-950/50 p-4 backdrop-blur-sm"
	onclick={(e) => {
		if (e.target === e.currentTarget) onClose();
	}}
	onkeydown={(e) => {
		if (e.key === "Escape") onClose();
	}}
>
	<div class="my-8 w-full max-w-5xl rounded-lg border border-neutral-200 bg-white shadow-xl dark:border-neutral-800 dark:bg-neutral-900">
		<header class="flex items-center justify-between gap-4 border-b border-neutral-200 p-4 dark:border-neutral-800">
			<div>
				<h2 class="text-lg font-semibold">
					{bucket.makeDisplay} {bucket.modelDisplay}
				</h2>
				<p class="text-xs text-neutral-500">
					{formatInt(bucket.count)} offers · sort by
				</p>
			</div>
			<div class="flex items-center gap-2">
				<label class="text-xs text-neutral-500" for="sort">Sort</label>
				<select
					id="sort"
					bind:value={sort}
					class="rounded border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-700 dark:bg-neutral-800"
				>
					<option value="price-asc">Price (low → high)</option>
					<option value="price-desc">Price (high → low)</option>
					<option value="year-desc">Year (newest)</option>
					<option value="mileage-asc">Mileage (lowest)</option>
				</select>
				<button
					type="button"
					onclick={onClose}
					class="rounded px-3 py-1 text-sm text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800"
					aria-label="Close"
				>
					Close
				</button>
			</div>
		</header>
		<ul class="divide-y divide-neutral-200 dark:divide-neutral-800">
			{#each sorted as o (o.id)}
				<li>
					<a
						href={o.url}
						target="_blank"
						rel="noopener noreferrer"
						class="flex gap-4 p-3 transition hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
					>
						<div class="h-24 w-32 shrink-0 overflow-hidden rounded bg-neutral-100 dark:bg-neutral-800">
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
								<h3 class="truncate font-medium">{o.title}</h3>
								<span class="shrink-0 font-semibold tabular-nums">
									{formatMoney(o.priceAmount, o.priceCurrency)}
								</span>
							</div>
							<p class="truncate text-sm text-neutral-600 dark:text-neutral-400">
								{o.shortDescription ?? ""}
							</p>
							<dl class="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-neutral-600 dark:text-neutral-400">
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
			{/each}
		</ul>
	</div>
</div>

<svelte:window
	on:keydown={(e) => {
		if (e.key === "Escape") onClose();
	}}
/>
