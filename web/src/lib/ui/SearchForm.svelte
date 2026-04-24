<script lang="ts">
	import { buildOtomotoUrl } from "$lib/otomoto-filters/build-url";
	import {
		FILTERS,
		emptyForm,
		genKey,
		type NumericRangeValue,
		type SearchFormState,
	} from "$lib/otomoto-filters/types";
	import { formatInt } from "./format";
	import ChipGroup from "./ChipGroup.svelte";
	import MakePicker from "./MakePicker.svelte";
	import RangeSlider from "./RangeSlider.svelte";

	interface Props {
		disabled?: boolean;
		initial?: SearchFormState;
		onChange?: (url: string, state: SearchFormState) => void;
		onSubmit: (url: string, state: SearchFormState) => void;
	}

	let { disabled = false, initial, onChange, onSubmit }: Props = $props();

	// svelte-ignore state_referenced_locally
	let state = $state<SearchFormState>(initial ?? emptyForm());

	// Emit state changes so the parent can sync the page URL live as the user
	// toggles filters. Skip the initial run so the URL isn't dirtied on mount.
	let firstRun = true;
	$effect(() => {
		const url = buildOtomotoUrl(state);
		if (firstRun) {
			firstRun = false;
			return;
		}
		onChange?.(url, state);
	});

	const priceSteps = $derived(FILTERS.ranges["filter_float_price"]!.suggestions);
	const yearSteps = $derived(FILTERS.ranges["filter_float_year"]!.suggestions);
	const mileageSteps = $derived(FILTERS.ranges["filter_float_mileage"]!.suggestions);
	const capacitySteps = $derived(
		FILTERS.ranges["filter_float_engine_capacity"]!.suggestions,
	);
	const powerSteps = $derived(
		FILTERS.ranges["filter_float_engine_power"]!.suggestions,
	);

	const makeNameById = $derived(
		Object.fromEntries(FILTERS.makes.map((m) => [m.id, m.name])) as Record<string, string>,
	);

	// Group models/generations by make (and model for generations) so users can
	// tell which chip belongs to which make when multiple makes are selected.
	// Model/generation filter URLs use the id alone, so toggling shared ids
	// (e.g. "other") across makes is intentionally a single action.
	const modelsByMake = $derived.by(() => {
		if (!state.makes.length) return [];
		const out: { makeId: string; makeName: string; models: { id: string; name: string }[] }[] = [];
		for (const mk of state.makes) {
			const models = FILTERS.models[mk] ?? [];
			if (!models.length) continue;
			out.push({ makeId: mk, makeName: makeNameById[mk] ?? mk, models });
		}
		return out;
	});

	const generationsByMakeModel = $derived.by(() => {
		if (!state.models.length) return [];
		const out: {
			key: string;
			makeName: string;
			modelName: string;
			generations: { id: string; name: string }[];
		}[] = [];
		for (const mk of state.makes) {
			for (const md of state.models) {
				const gens = FILTERS.generations[genKey(mk, md)];
				if (!gens?.length) continue;
				const modelName =
					(FILTERS.models[mk] ?? []).find((m) => m.id === md)?.name ?? md;
				out.push({
					key: genKey(mk, md),
					makeName: makeNameById[mk] ?? mk,
					modelName,
					generations: gens,
				});
			}
		}
		return out;
	});

	// Group equipment booleans by parent so we can render them under collapsible sections.
	const booleansByGroup = $derived.by(() => {
		const byGroup: Record<string, typeof FILTERS.booleans> = {};
		for (const b of FILTERS.booleans) {
			const g = b.parent ?? "other";
			(byGroup[g] ??= []).push(b);
		}
		return byGroup;
	});

	function toggleMake(id: string) {
		const next = new Set(state.makes);
		if (next.has(id)) {
			next.delete(id);
			// Drop models/generations that belonged to the removed make.
			state.models = state.models.filter((m) => {
				const still = [...next].some((mk) =>
					(FILTERS.models[mk] ?? []).some((x) => x.id === m),
				);
				return still;
			});
			state.generations = state.generations.filter((g) => {
				return [...next].some((mk) =>
					state.models.some((md) => {
						const gens = FILTERS.generations[genKey(mk, md)] ?? [];
						return gens.some((x) => x.id === g);
					}),
				);
			});
		} else {
			next.add(id);
		}
		state.makes = [...next];
	}
	function toggleModel(id: string) {
		const set = new Set(state.models);
		if (set.has(id)) {
			set.delete(id);
			// Clear generations tied to removed model.
			state.generations = state.generations.filter((g) => {
				return state.makes.some((mk) =>
					[...set].some((md) =>
						(FILTERS.generations[genKey(mk, md)] ?? []).some(
							(x) => x.id === g,
						),
					),
				);
			});
		} else {
			set.add(id);
		}
		state.models = [...set];
	}
	function toggleGeneration(id: string) {
		const set = new Set(state.generations);
		if (set.has(id)) set.delete(id);
		else set.add(id);
		state.generations = [...set];
	}
	function toggleEnum(filterId: string, value: string) {
		const current = state.enums[filterId] ?? [];
		const set = new Set(current);
		if (set.has(value)) set.delete(value);
		else set.add(value);
		state.enums = { ...state.enums, [filterId]: [...set] };
	}
	function toggleBoolean(filterId: string) {
		state.booleans = {
			...state.booleans,
			[filterId]: !state.booleans[filterId],
		};
	}
	function setRange(
		key: "price" | "year" | "mileage" | "engineCapacity" | "enginePower",
		value: NumericRangeValue,
	) {
		state[key] = value;
	}
	function setNewUsed(v: "new" | "used") {
		state.newUsed = state.newUsed === v ? null : v;
	}
	function setPrivateBusiness(v: "private" | "business") {
		state.privateBusiness = state.privateBusiness === v ? null : v;
	}
	function reset() {
		state = emptyForm();
	}

	function submit(e: Event) {
		e.preventDefault();
		if (disabled) return;
		onSubmit(buildOtomotoUrl(state), state);
	}

	const activeCount = $derived(
		state.makes.length +
			state.models.length +
			state.generations.length +
			Object.values(state.enums).reduce((a, b) => a + b.length, 0) +
			Object.values(state.booleans).filter(Boolean).length +
			(state.newUsed ? 1 : 0) +
			(state.privateBusiness ? 1 : 0) +
			(state.price.from != null || state.price.to != null ? 1 : 0) +
			(state.year.from != null || state.year.to != null ? 1 : 0) +
			(state.mileage.from != null || state.mileage.to != null ? 1 : 0) +
			(state.engineCapacity.from != null || state.engineCapacity.to != null
				? 1
				: 0) +
			(state.enginePower.from != null || state.enginePower.to != null ? 1 : 0),
	);

	const priceFormat = (n: number) => `${formatInt(n)} zł`;
	const mileageFormat = (n: number) => `${formatInt(n)} km`;
	const powerFormat = (n: number) => `${n} KM`;
	const capacityFormat = (n: number) => `${formatInt(n)} cm³`;
</script>

<form onsubmit={submit} class="flex flex-col gap-4">
	<section class="rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
		<h2 class="mb-3 text-base font-semibold">Marka i model</h2>

		<div class="flex flex-col gap-4">
			<div>
				<div class="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
					Marka
				</div>
				<MakePicker
					makes={FILTERS.makes}
					selected={state.makes}
					onToggle={toggleMake}
				/>
			</div>

			{#if modelsByMake.length > 0}
				<div>
					<div class="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
						Model
					</div>
					<div class="flex flex-col gap-3">
						{#each modelsByMake as grp (grp.makeId)}
							<div>
								{#if modelsByMake.length > 1}
									<div class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
										{grp.makeName}
									</div>
								{/if}
								<ChipGroup
									options={grp.models}
									selected={state.models}
									onToggle={toggleModel}
									ariaLabel="Modele {grp.makeName}"
								/>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			{#if generationsByMakeModel.length > 0}
				<div>
					<div class="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
						Generacja
					</div>
					<div class="flex flex-col gap-3">
						{#each generationsByMakeModel as grp (grp.key)}
							<div>
								<div class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
									{#if modelsByMake.length > 1}{grp.makeName} · {/if}{grp.modelName}
								</div>
								<ChipGroup
									options={grp.generations}
									selected={state.generations}
									onToggle={toggleGeneration}
									ariaLabel="Generacje {grp.modelName}"
								/>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</section>

	<section class="flex flex-col gap-6 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
		<RangeSlider
			label="Cena (PLN)"
			value={state.price}
			steps={priceSteps}
			format={priceFormat}
			onChange={(v) => setRange("price", v)}
		/>
		<RangeSlider
			label="Rok produkcji"
			value={state.year}
			steps={yearSteps}
			onChange={(v) => setRange("year", v)}
		/>
		<RangeSlider
			label="Przebieg"
			value={state.mileage}
			steps={mileageSteps}
			format={mileageFormat}
			onChange={(v) => setRange("mileage", v)}
		/>
	</section>

	<section class="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
		<h2 class="text-base font-semibold">Napęd i silnik</h2>

		<div>
			<div class="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
				Paliwo
			</div>
			<ChipGroup
				options={FILTERS.enums["filter_enum_fuel_type"] ?? []}
				selected={state.enums["filter_enum_fuel_type"] ?? []}
				onToggle={(v) => toggleEnum("filter_enum_fuel_type", v)}
			/>
		</div>

		<div>
			<div class="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
				Skrzynia biegów
			</div>
			<ChipGroup
				options={FILTERS.enums["filter_enum_gearbox"] ?? []}
				selected={state.enums["filter_enum_gearbox"] ?? []}
				onToggle={(v) => toggleEnum("filter_enum_gearbox", v)}
			/>
		</div>

		<div>
			<div class="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
				Napęd
			</div>
			<ChipGroup
				options={FILTERS.enums["filter_enum_transmission"] ?? []}
				selected={state.enums["filter_enum_transmission"] ?? []}
				onToggle={(v) => toggleEnum("filter_enum_transmission", v)}
			/>
		</div>

		<RangeSlider
			label="Pojemność silnika"
			value={state.engineCapacity}
			steps={capacitySteps}
			format={capacityFormat}
			onChange={(v) => setRange("engineCapacity", v)}
		/>
		<RangeSlider
			label="Moc silnika"
			value={state.enginePower}
			steps={powerSteps}
			format={powerFormat}
			onChange={(v) => setRange("enginePower", v)}
		/>
	</section>

	<section class="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
		<h2 class="text-base font-semibold">Nadwozie i wnętrze</h2>

		<div>
			<div class="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
				Typ nadwozia
			</div>
			<ChipGroup
				options={FILTERS.enums["filter_enum_body_type"] ?? []}
				selected={state.enums["filter_enum_body_type"] ?? []}
				onToggle={(v) => toggleEnum("filter_enum_body_type", v)}
			/>
		</div>

		<div>
			<div class="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
				Liczba drzwi
			</div>
			<ChipGroup
				options={FILTERS.enums["filter_enum_door_count"] ?? []}
				selected={state.enums["filter_enum_door_count"] ?? []}
				onToggle={(v) => toggleEnum("filter_enum_door_count", v)}
			/>
		</div>

		<div>
			<div class="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
				Liczba miejsc
			</div>
			<ChipGroup
				options={FILTERS.enums["filter_float_nr_seats"] ?? []}
				selected={state.enums["filter_float_nr_seats"] ?? []}
				onToggle={(v) => toggleEnum("filter_float_nr_seats", v)}
			/>
		</div>

		<div>
			<div class="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
				Kolor
			</div>
			<ChipGroup
				options={FILTERS.enums["filter_enum_color"] ?? []}
				selected={state.enums["filter_enum_color"] ?? []}
				onToggle={(v) => toggleEnum("filter_enum_color", v)}
			/>
		</div>

		<div>
			<div class="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
				Typ lakieru
			</div>
			<ChipGroup
				options={FILTERS.enums["filter_enum_colour_type"] ?? []}
				selected={state.enums["filter_enum_colour_type"] ?? []}
				onToggle={(v) => toggleEnum("filter_enum_colour_type", v)}
			/>
		</div>

		<div>
			<div class="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
				Tapicerka
			</div>
			<ChipGroup
				options={FILTERS.enums["filter_enum_upholstery_type"] ?? []}
				selected={state.enums["filter_enum_upholstery_type"] ?? []}
				onToggle={(v) => toggleEnum("filter_enum_upholstery_type", v)}
			/>
		</div>
	</section>

	<section class="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
		<h2 class="text-base font-semibold">Ogłoszenie</h2>

		<div>
			<div class="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
				Typ oferty
			</div>
			<ChipGroup
				options={[
					{ id: "new", name: "Nowy" },
					{ id: "used", name: "Używany" },
				]}
				selected={state.newUsed ? [state.newUsed] : []}
				onToggle={(v) => setNewUsed(v as "new" | "used")}
			/>
		</div>

		<div>
			<div class="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
				Sprzedawca
			</div>
			<ChipGroup
				options={[
					{ id: "private", name: "Prywatny" },
					{ id: "business", name: "Firma" },
				]}
				selected={state.privateBusiness ? [state.privateBusiness] : []}
				onToggle={(v) => setPrivateBusiness(v as "private" | "business")}
			/>
		</div>

		<div>
			<div class="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
				Stan
			</div>
			<ChipGroup
				options={FILTERS.enums["filter_enum_damaged"] ?? []}
				selected={state.enums["filter_enum_damaged"] ?? []}
				onToggle={(v) => toggleEnum("filter_enum_damaged", v)}
			/>
		</div>

		<div>
			<div class="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
				Kraj pochodzenia
			</div>
			<ChipGroup
				options={FILTERS.enums["filter_enum_country_origin"] ?? []}
				selected={state.enums["filter_enum_country_origin"] ?? []}
				onToggle={(v) => toggleEnum("filter_enum_country_origin", v)}
			/>
		</div>
	</section>

	{#each ["seller_details", "history_condition", "connectivity", "electric_vehicles"] as groupId (groupId)}
		{@const groupMeta = FILTERS.groups[groupId]}
		{@const items = booleansByGroup[groupId] ?? []}
		{#if groupMeta && items.length > 0}
			<details open class="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
				<summary class="cursor-pointer px-4 py-3 text-base font-semibold">
					{groupMeta.name}
					{#if groupMeta.description}
						<span class="ml-2 text-xs font-normal text-neutral-500">
							{groupMeta.description}
						</span>
					{/if}
				</summary>
				<div class="flex flex-wrap gap-1.5 px-4 pb-4">
					<ChipGroup
						options={items.map((b) => ({ id: b.id, name: b.name }))}
						selected={items.filter((b) => state.booleans[b.id]).map((b) => b.id)}
						onToggle={(id) => toggleBoolean(id)}
					/>
				</div>
			</details>
		{/if}
	{/each}

	{#if FILTERS.enums["filter_enum_air_conditioning_type"]}
		<!-- Multi-enum extras not fitted elsewhere: air conditioning, sunroof, cruise control, lights, battery ownership -->
		<details open class="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
			<summary class="cursor-pointer px-4 py-3 text-base font-semibold">
				Komfort i oświetlenie
			</summary>
			<div class="flex flex-col gap-4 px-4 pb-4">
				<div>
					<div class="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
						Klimatyzacja
					</div>
					<ChipGroup
						options={FILTERS.enums["filter_enum_air_conditioning_type"] ?? []}
						selected={state.enums["filter_enum_air_conditioning_type"] ?? []}
						onToggle={(v) => toggleEnum("filter_enum_air_conditioning_type", v)}
					/>
				</div>
				<div>
					<div class="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
						Szyberdach
					</div>
					<ChipGroup
						options={FILTERS.enums["filter_enum_sunroof"] ?? []}
						selected={state.enums["filter_enum_sunroof"] ?? []}
						onToggle={(v) => toggleEnum("filter_enum_sunroof", v)}
					/>
				</div>
				<div>
					<div class="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
						Tempomat
					</div>
					<ChipGroup
						options={FILTERS.enums["filter_enum_cruisecontrol_type"] ?? []}
						selected={state.enums["filter_enum_cruisecontrol_type"] ?? []}
						onToggle={(v) => toggleEnum("filter_enum_cruisecontrol_type", v)}
					/>
				</div>
				<div>
					<div class="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
						Reflektory
					</div>
					<ChipGroup
						options={FILTERS.enums["filter_enum_headlight_lamp_type"] ?? []}
						selected={state.enums["filter_enum_headlight_lamp_type"] ?? []}
						onToggle={(v) => toggleEnum("filter_enum_headlight_lamp_type", v)}
					/>
				</div>
				<div>
					<div class="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
						Bateria (EV)
					</div>
					<ChipGroup
						options={FILTERS.enums["filter_string_battery_ownership_model"] ?? []}
						selected={state.enums["filter_string_battery_ownership_model"] ?? []}
						onToggle={(v) => toggleEnum("filter_string_battery_ownership_model", v)}
					/>
				</div>
			</div>
		</details>
	{/if}

	<div class="sticky bottom-0 z-10 flex items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-50/95 px-1 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
		<button
			type="button"
			onclick={reset}
			class="rounded border border-neutral-300 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800"
		>
			Wyczyść
			{#if activeCount > 0}
				<span class="ml-1 text-xs text-neutral-500">({activeCount})</span>
			{/if}
		</button>
		<button
			type="submit"
			disabled={disabled}
			class="flex-1 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm enabled:hover:bg-blue-500 disabled:opacity-50"
		>
			Szukaj ofert
		</button>
	</div>
</form>
