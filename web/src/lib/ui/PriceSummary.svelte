<script lang="ts">
	import type { PriceOverallResult } from "$lib/aggregations/types";
	import { formatMoney } from "./format";

	let { result }: { result: PriceOverallResult } = $props();
</script>

<dl class="grid grid-cols-2 gap-3 sm:grid-cols-4">
	<div>
		<dt class="text-xs uppercase tracking-wide text-neutral-500">Offers</dt>
		<dd class="text-lg font-semibold tabular-nums">{result.totalOffers}</dd>
	</div>
	<div>
		<dt class="text-xs uppercase tracking-wide text-neutral-500">Min</dt>
		<dd class="text-lg font-semibold tabular-nums">
			{formatMoney(result.min, result.currency)}
		</dd>
	</div>
	<div>
		<dt class="text-xs uppercase tracking-wide text-neutral-500">Median</dt>
		<dd class="text-lg font-semibold tabular-nums">
			{formatMoney(result.median, result.currency)}
		</dd>
	</div>
	<div>
		<dt class="text-xs uppercase tracking-wide text-neutral-500">Max</dt>
		<dd class="text-lg font-semibold tabular-nums">
			{formatMoney(result.max, result.currency)}
		</dd>
	</div>
</dl>
