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

const rtf = new Intl.RelativeTimeFormat("pl", { numeric: "auto" });

export function formatRelativeTime(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  // Otomoto returns "YYYY-MM-DD HH:mm:ss" (no zone); olx returns ISO8601.
  // Replace the space so Date.parse treats it as ISO across engines.
  const ts = Date.parse(value.replace(" ", "T"));
  if (!Number.isFinite(ts)) return null;
  const diffSec = Math.round((ts - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, "hour");
  const diffDay = Math.round(diffHr / 24);
  if (Math.abs(diffDay) < 30) return rtf.format(diffDay, "day");
  const diffMo = Math.round(diffDay / 30);
  if (Math.abs(diffMo) < 12) return rtf.format(diffMo, "month");
  const diffYr = Math.round(diffMo / 12);
  return rtf.format(diffYr, "year");
}
