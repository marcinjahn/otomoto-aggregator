<script lang="ts">
	import type { MakeEntry } from "$lib/otomoto-filters/types";

	interface Props {
		makes: MakeEntry[];
		selected: string[];
		onToggle: (id: string) => void;
	}

	let { makes, selected, onToggle }: Props = $props();

	const sorted = $derived(
		[...makes].sort((a, b) => a.name.localeCompare(b.name, "pl")),
	);

	const selectedSet = $derived(new Set(selected));

	function logoUrl(id: string) {
		return `https://cdn.jsdelivr.net/gh/filippofilip95/car-logos-dataset/logos/optimized/${id}.png`;
	}
</script>

<div role="group" aria-label="Marki" class="flex flex-wrap gap-1.5">
	{#each sorted as m (m.id)}
		{@const sel = selectedSet.has(m.id)}
		<button
			type="button"
			onclick={() => onToggle(m.id)}
			aria-pressed={sel}
			class="flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition select-none"
			class:border-blue-500={sel}
			class:bg-blue-600={sel}
			class:text-white={sel}
			class:font-semibold={sel}
			class:border-neutral-300={!sel}
			class:bg-white={!sel}
			class:dark:border-neutral-700={!sel}
			class:dark:bg-neutral-900={!sel}
			class:dark:text-neutral-100={!sel}
			class:hover:border-blue-400={!sel}
			class:hover:bg-blue-50={!sel}
			class:dark:hover:bg-neutral-800={!sel}
		>
			<img
				src={logoUrl(m.id)}
				alt=""
				loading="lazy"
				class="h-6 w-6 shrink-0 object-contain"
				class:bg-white={sel}
				class:rounded-sm={sel}
				onerror={(e) => (e.currentTarget as HTMLImageElement).remove()}
			/>
			{m.name}
		</button>
	{/each}
</div>
