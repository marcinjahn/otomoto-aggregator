<script lang="ts" generics="T extends { id: string; name: string }">
	interface Props {
		options: T[];
		selected: string[];
		onToggle: (id: string) => void;
		columns?: number;
		ariaLabel?: string;
	}

	let {
		options,
		selected,
		onToggle,
		columns = 0,
		ariaLabel,
	}: Props = $props();

	const selectedSet = $derived(new Set(selected));
</script>

<div
	role="group"
	aria-label={ariaLabel}
	class="flex flex-wrap gap-1.5"
	class:grid={columns > 0}
	class:grid-cols-2={columns === 2}
	class:grid-cols-3={columns === 3}
	class:grid-cols-4={columns === 4}
>
	{#each options as opt (opt.id)}
		{@const sel = selectedSet.has(opt.id)}
		<button
			type="button"
			onclick={() => onToggle(opt.id)}
			aria-pressed={sel}
			class="min-h-9 rounded-full border px-3 py-1.5 text-sm transition select-none"
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
			{opt.name}
		</button>
	{/each}
</div>
