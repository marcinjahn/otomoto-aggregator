<script lang="ts">
	import type { MakeEntry } from "$lib/otomoto-filters/types";
	import ChipGroup from "./ChipGroup.svelte";

	interface Props {
		makes: MakeEntry[];
		selected: string[];
		onToggle: (id: string) => void;
	}

	let { makes, selected, onToggle }: Props = $props();

	// Sort by popularity so the most-relevant makes appear first,
	// but show every make — no hidden items behind an expander.
	const sorted = $derived(
		[...makes].sort((a, b) => b.counter - a.counter || a.name.localeCompare(b.name, "pl")),
	);
</script>

<ChipGroup options={sorted} {selected} {onToggle} ariaLabel="Marki" />
