<script lang="ts">
	interface Props {
		title: string;
		active: boolean;
		onClear: () => void;
		open?: boolean;
		children: import("svelte").Snippet;
	}

	let { title, active, onClear, open = false, children }: Props = $props();
</script>

<details
	{open}
	class="rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900"
>
	<summary class="flex cursor-pointer items-center justify-between gap-2 text-sm font-semibold">
		<span class="truncate">{title}</span>
		{#if active}
			<button
				type="button"
				onclick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					onClear();
				}}
				class="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-medium text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
				aria-label="Clear {title} filter"
			>
				Clear
			</button>
		{/if}
	</summary>
	<div class="mt-3">
		{@render children()}
	</div>
</details>
