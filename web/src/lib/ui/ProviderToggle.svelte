<script lang="ts">
	import { PROVIDERS } from "$lib/providers/registry";
	import type { ProviderId } from "$lib/providers/types";

	interface Props {
		active: ProviderId[];
		disabled?: boolean;
		onChange: (next: ProviderId[]) => void;
	}

	let { active, disabled = false, onChange }: Props = $props();

	function toggle(id: ProviderId) {
		const set = new Set(active);
		if (set.has(id)) {
			if (set.size <= 1) return;
			set.delete(id);
		} else {
			set.add(id);
		}
		onChange(PROVIDERS.map((p) => p.id).filter((p) => set.has(p)));
	}
</script>

<div class="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
	<span class="text-xs font-medium uppercase tracking-wide text-neutral-500">
		Źródła
	</span>
	<div class="flex flex-wrap gap-1.5">
		{#each PROVIDERS as p (p.id)}
			{@const on = active.includes(p.id)}
			<button
				type="button"
				onclick={() => toggle(p.id)}
				disabled={disabled || (on && active.length === 1)}
				aria-pressed={on}
				class={"inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition disabled:opacity-60 " +
					(on
						? "border-blue-500 bg-blue-600 text-white shadow-sm enabled:hover:bg-blue-500"
						: "border-neutral-300 bg-white text-neutral-700 enabled:hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:enabled:hover:bg-neutral-800")}
			>
				<span
					class="inline-block rounded px-1 text-[10px] font-bold leading-tight text-white"
					style:background-color={p.id === "otomoto" ? "#ed1c24" : "#002f34"}
				>
					{p.badgeText}
				</span>
				<span>{p.label}</span>
			</button>
		{/each}
	</div>
</div>
