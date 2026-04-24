const intFormat = new Intl.NumberFormat("pl-PL");

export function formatInt(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return intFormat.format(Math.round(n));
}

export function formatMoney(
  n: number | null | undefined,
  currency: string | null | undefined,
): string {
  if (n == null) return "—";
  const rounded = Math.round(n);
  const num = intFormat.format(rounded);
  return `${num} ${currency ?? "PLN"}`;
}

export function formatRange(
  range: { min: number; max: number } | null,
  formatter: (n: number) => string,
): string {
  if (!range) return "—";
  if (range.min === range.max) return formatter(range.min);
  return `${formatter(range.min)} – ${formatter(range.max)}`;
}

export function formatKm(n: number | null | undefined): string {
  if (n == null) return "—";
  return `${intFormat.format(Math.round(n))} km`;
}
