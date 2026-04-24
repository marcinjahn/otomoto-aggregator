/**
 * Otomoto image URLs embed a size segment like `;s=320x240`. The CDN happily
 * serves larger sizes (up to ~1400x1050), so we rewrite the segment when we
 * need a crisper image than the scraper returned.
 */
export function resizeOtomotoImage(
  url: string | null | undefined,
  size: `${number}x${number}`,
): string | null {
  if (!url) return null;
  if (!/olxcdn\.com/.test(url)) return url;
  return url.replace(/;s=\d+x\d+/, `;s=${size}`);
}
