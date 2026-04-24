export function median(sortedAsc: number[]): number | null {
  if (sortedAsc.length === 0) return null;
  const mid = Math.floor(sortedAsc.length / 2);
  if (sortedAsc.length % 2 === 0) {
    return (sortedAsc[mid - 1]! + sortedAsc[mid]!) / 2;
  }
  return sortedAsc[mid]!;
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

export function minMax(values: number[]): { min: number; max: number } | null {
  if (values.length === 0) return null;
  let lo = values[0]!;
  let hi = values[0]!;
  for (let i = 1; i < values.length; i++) {
    const v = values[i]!;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return { min: lo, max: hi };
}
