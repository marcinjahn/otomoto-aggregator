<script lang="ts">
	import type { MakeEntry } from "$lib/otomoto-filters/types";
	import ChipGroup from "./ChipGroup.svelte";

	interface Props {
		makes: MakeEntry[];
		selected: string[];
		onToggle: (id: string) => void;
	}

	let { makes, selected, onToggle }: Props = $props();

	const POPULAR_COUNT = 16;

	const popular = $derived(
		[...makes].sort((a, b) => b.counter - a.counter).slice(0, POPULAR_COUNT),
	);
	const popularIds = $derived(new Set(popular.map((m) => m.id)));

	// Selected items always visible, even if not in the popular list.
	const extraSelected = $derived(
		makes.filter((m) => selected.includes(m.id) && !popularIds.has(m.id)),
	);

	let showAll = $state(false);

	const topList = $derived([...popular, ...extraSelected]);
	const extraSelectedIds = $derived(new Set(extraSelected.map((m) => m.id)));
	const fullList = $derived(
		makes.filter((m) => !popularIds.has(m.id) && !extraSelectedIds.has(m.id)),
	);
</script>

<div class="flex flex-col gap-2">
	<ChipGroup options={topList} {selected} {onToggle} ariaLabel="Marki" />

	{#if !showAll}
		<button
			type="button"
			onclick={() => (showAll = true)}
			class="self-start text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
		>
			Pokaż wszystkie marki ({makes.length})
		</button>
	{:else}
		<div class="mt-1 border-t border-neutral-200 pt-2 dark:border-neutral-800">
			<ChipGroup
				options={fullList}
				{selected}
				{onToggle}
				ariaLabel="Pozostałe marki"
			/>
		</div>
		<button
			type="button"
			onclick={() => (showAll = false)}
			class="self-start text-xs text-neutral-500 hover:underline"
		>
			Pokaż mniej
		</button>
	{/if}
</div>
