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

/**
 * Build a srcset with multiple widths so the browser picks the best match for
 * the device pixel ratio. The height is scaled proportionally to 3:4 aspect
 * (otomoto's native ratio).
 */
export function otomotoSrcSet(
  url: string | null | undefined,
  widths: number[] = [320, 480, 640, 960],
): string | null {
  if (!url || !/olxcdn\.com/.test(url)) return null;
  return widths
    .map((w) => {
      const h = Math.round((w / 4) * 3);
      const resized = url.replace(/;s=\d+x\d+/, `;s=${w}x${h}`);
      return `${resized} ${w}w`;
    })
    .join(", ");
}
