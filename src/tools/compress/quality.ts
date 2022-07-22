import { phrase } from '../../i18n/phrase';
export function clampQuality(quality: number): number {
  if (!Number.isFinite(quality)) throw new Error(phrase('error.quality'));
  return Math.min(100, Math.max(1, Math.round(quality)));
}

/** OxiPNG effort. Lower quality asks for a stronger lossless pass, capped so a large PNG cannot stall the page. */
export function pngEffort(quality: number): number {
  const value = clampQuality(quality);
  if (value >= 80) return 1;
  if (value >= 40) return 2;
  return 3;
}

export function gifColorCount(quality: number): number {
  const value = clampQuality(quality);
  return Math.min(256, Math.max(2, Math.round((value / 100) * 256)));
}

/** Decimal places kept by SVGO. Higher quality keeps more precision. */
export function svgFloatPrecision(quality: number): number {
  const value = clampQuality(quality);
  if (value >= 90) return 3;
  if (value >= 60) return 2;
  if (value >= 30) return 1;
  return 0;
}
