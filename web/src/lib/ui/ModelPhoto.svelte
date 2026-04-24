<script lang="ts">
	import { getModelPhoto } from "$lib/model-photos";

	let {
		make,
		model,
		year = null,
		fallback,
		alt,
		class: klass = "",
	}: {
		make: string;
		model: string;
		year?: number | null;
		fallback: string | null;
		alt: string;
		class?: string;
	} = $props();

	let src = $state<string | null>(null);
	let loaded = $state(false);

	$effect(() => {
		let cancelled = false;
		src = fallback;
		getModelPhoto(make, model, year).then((url) => {
			if (!cancelled && url) src = url;
		});
		return () => {
			cancelled = true;
		};
	});
</script>

{#if src}
	<img
		{src}
		{alt}
		loading="lazy"
		onload={() => (loaded = true)}
		class={`h-full w-full object-cover transition-opacity ${loaded ? "opacity-100" : "opacity-0"} ${klass}`}
	/>
{:else}
	<div
		class={`flex h-full w-full items-center justify-center text-xs text-neutral-400 ${klass}`}
	>
		no photo
	</div>
{/if}
