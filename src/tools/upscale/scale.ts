import { phrase } from '../../i18n/phrase';
export type UpscaleFactor = 2 | 4;

export function upscaleDimensions(
  width: number,
  height: number,
  factor: UpscaleFactor,
): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    throw new Error(phrase('error.unusableSize'));
  }
  if (factor !== 2 && factor !== 4) throw new Error(phrase('error.factor'));
  const sourceWidth = Math.round(width);
  const sourceHeight = Math.round(height);
  return { width: sourceWidth * factor, height: sourceHeight * factor };
}
