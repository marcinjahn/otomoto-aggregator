<script lang="ts">
	import { theme, type ThemeMode } from "$lib/theme.svelte";

	const options: { value: ThemeMode; label: string; icon: string }[] = [
		{ value: "light", label: "Light", icon: "☀" },
		{ value: "auto", label: "Auto", icon: "◐" },
		{ value: "dark", label: "Dark", icon: "☾" },
	];
</script>

<div
	role="radiogroup"
	aria-label="Theme"
	class="inline-flex overflow-hidden rounded-md border border-neutral-300 bg-white text-xs dark:border-neutral-700 dark:bg-neutral-900"
>
	{#each options as o (o.value)}
		{@const sel = theme.mode === o.value}
		<button
			type="button"
			role="radio"
			aria-checked={sel}
			onclick={() => theme.set(o.value)}
			title={o.label}
			class="flex items-center gap-1 px-2 py-1 transition"
			class:bg-blue-600={sel}
			class:text-white={sel}
			class:hover:bg-neutral-100={!sel}
			class:dark:hover:bg-neutral-800={!sel}
		>
			<span aria-hidden="true">{o.icon}</span>
			<span class="sr-only sm:not-sr-only">{o.label}</span>
		</button>
	{/each}
</div>
