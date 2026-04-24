<script lang="ts">
	import type { MakeEntry } from "$lib/otomoto-filters/types";
	import ChipGroup from "./ChipGroup.svelte";

	interface Props {
		makes: MakeEntry[];
		selected: string[];
		onToggle: (id: string) => void;
	}

	let { makes, selected, onToggle }: Props = $props();

	const sorted = $derived(
		[...makes].sort((a, b) => a.name.localeCompare(b.name, "pl")),
	);
</script>

<ChipGroup options={sorted} {selected} {onToggle} ariaLabel="Marki" />
