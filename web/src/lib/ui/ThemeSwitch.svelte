<script lang="ts">
	import { theme, type ThemeMode } from "$lib/theme.svelte";

	const options: { value: ThemeMode; label: string }[] = [
		{ value: "light", label: "Light" },
		{ value: "auto", label: "System" },
		{ value: "dark", label: "Dark" },
	];
</script>

<div
	role="radiogroup"
	aria-label="Theme"
	class="inline-flex gap-0.5 rounded-md border border-neutral-300 bg-white p-0.5 dark:border-neutral-700 dark:bg-neutral-900"
>
	{#each options as o (o.value)}
		{@const sel = theme.mode === o.value}
		<button
			type="button"
			role="radio"
			aria-checked={sel}
			aria-label={o.label}
			title={o.label}
			onclick={() => theme.set(o.value)}
			class="flex h-7 w-7 items-center justify-center rounded transition"
			class:bg-blue-600={sel}
			class:text-white={sel}
			class:text-neutral-500={!sel}
			class:hover:bg-neutral-100={!sel}
			class:dark:hover:bg-neutral-800={!sel}
		>
			{#if o.value === "light"}
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="h-4 w-4"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="4" />
					<path d="M12 2v2" />
					<path d="M12 20v2" />
					<path d="m4.93 4.93 1.41 1.41" />
					<path d="m17.66 17.66 1.41 1.41" />
					<path d="M2 12h2" />
					<path d="M20 12h2" />
					<path d="m6.34 17.66-1.41 1.41" />
					<path d="m19.07 4.93-1.41 1.41" />
				</svg>
			{:else if o.value === "dark"}
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="h-4 w-4"
					aria-hidden="true"
				>
					<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
				</svg>
			{:else}
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="h-4 w-4"
					aria-hidden="true"
				>
					<rect x="2" y="4" width="20" height="14" rx="2" />
					<path d="M8 21h8" />
					<path d="M12 18v3" />
				</svg>
			{/if}
		</button>
	{/each}
</div>
