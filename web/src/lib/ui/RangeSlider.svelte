<script lang="ts">
	import type { NumericRangeValue } from "$lib/form/types";

	interface Props {
		label: string;
		value: NumericRangeValue;
		/** Sorted ascending list of selectable values; slider snaps to these. */
		steps: number[];
		/** Format a value for display (e.g. price formatter). */
		format?: (n: number) => string;
		onChange: (v: NumericRangeValue) => void;
	}

	let { label, value, steps, format, onChange }: Props = $props();

	const fmt = (n: number) => (format ? format(n) : String(n));

	const maxIdx = $derived(steps.length - 1);

	const fromIdx = $derived.by(() => {
		if (value.from == null) return 0;
		const i = steps.findIndex((s) => s >= value.from!);
		return i < 0 ? maxIdx : i;
	});
	const toIdx = $derived.by(() => {
		if (value.to == null) return maxIdx;
		const rev = [...steps].reverse().findIndex((s) => s <= value.to!);
		return rev < 0 ? 0 : maxIdx - rev;
	});

	const leftPct = $derived((fromIdx / Math.max(1, maxIdx)) * 100);
	const rightPct = $derived((toIdx / Math.max(1, maxIdx)) * 100);

	function setFrom(idx: number) {
		const clamped = Math.min(idx, toIdx);
		const from = clamped === 0 ? null : steps[clamped]!;
		onChange({ from, to: value.to });
	}
	function setTo(idx: number) {
		const clamped = Math.max(idx, fromIdx);
		const to = clamped === maxIdx ? null : steps[clamped]!;
		onChange({ from: value.from, to });
	}

	const fromLabel = $derived(
		value.from == null ? "Dowolnie" : `od ${fmt(value.from)}`,
	);
	const toLabel = $derived(
		value.to == null ? "dowolnie" : `do ${fmt(value.to)}`,
	);
</script>

<div class="flex flex-col gap-3">
	<div class="flex items-baseline justify-between gap-2 text-sm">
		<span class="font-medium">{label}</span>
		<span class="tabular-nums text-neutral-700 dark:text-neutral-300">
			{fromLabel} &middot; {toLabel}
		</span>
	</div>

	<div class="relative h-10 px-2">
		<div
			class="pointer-events-none absolute inset-x-2 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-neutral-200 dark:bg-neutral-700"
		></div>
		<div
			class="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-blue-500"
			style="left: calc(0.5rem + {leftPct}% - {leftPct * 0.01}rem); right: calc(0.5rem + {100 - rightPct}% - {(100 - rightPct) * 0.01}rem);"
		></div>
		<input
			type="range"
			min={0}
			max={maxIdx}
			step={1}
			value={fromIdx}
			oninput={(e) => setFrom(Number((e.target as HTMLInputElement).value))}
			aria-label="{label} od"
			class="range-input"
		/>
		<input
			type="range"
			min={0}
			max={maxIdx}
			step={1}
			value={toIdx}
			oninput={(e) => setTo(Number((e.target as HTMLInputElement).value))}
			aria-label="{label} do"
			class="range-input"
		/>
	</div>
</div>

<style>
	.range-input {
		pointer-events: none;
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		appearance: none;
		background: transparent;
		padding: 0;
		margin: 0;
	}

	.range-input::-webkit-slider-thumb {
		pointer-events: auto;
		appearance: none;
		height: 1.75rem;
		width: 1.75rem;
		border-radius: 9999px;
		background: white;
		border: 2px solid rgb(37 99 235);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
		cursor: grab;
	}
	.range-input:active::-webkit-slider-thumb {
		cursor: grabbing;
	}
	.range-input::-moz-range-thumb {
		pointer-events: auto;
		height: 1.75rem;
		width: 1.75rem;
		border-radius: 9999px;
		background: white;
		border: 2px solid rgb(37 99 235);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
		cursor: grab;
	}
	.range-input::-moz-range-track {
		background: transparent;
	}

	:global(.dark) .range-input::-webkit-slider-thumb {
		background: rgb(23 23 23);
		border-color: rgb(59 130 246);
	}
	:global(.dark) .range-input::-moz-range-thumb {
		background: rgb(23 23 23);
		border-color: rgb(59 130 246);
	}
</style>
