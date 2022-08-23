import { phrase } from '../../i18n/phrase';
export type MemePlacement = 'inside' | 'outside';

export function memeFontSize(width: number): number {
  if (!(width > 0)) return 18;
  return Math.max(8, Math.min(96, Math.round(width / 12)));
}

export function memeLineHeight(fontSize: number): number {
  return Math.round(fontSize * 1.15);
}

export function memeBandPad(fontSize: number): number {
  return Math.round(fontSize * 0.4);
}

export function captionBandHeight(lineCount: number, fontSize: number): number {
  if (lineCount <= 0 || !(fontSize > 0)) return 0;
  return lineCount * memeLineHeight(fontSize) + memeBandPad(fontSize) * 2;
}

/** Text outside adds a band above and a band below the source pixels. */
export function textOutsideHeight(sourceHeight: number, topBand: number, bottomBand: number): number {
  if (sourceHeight < 0 || topBand < 0 || bottomBand < 0) {
    throw new Error(phrase('error.captionBands'));
  }
  return sourceHeight + topBand + bottomBand;
}
