import { phrase } from '../../i18n/phrase';
export const MAX_EDGE = 8192;

export function scaleDimensions(width: number, height: number, percent: number): { width: number; height: number } {
  if (!(width > 0) || !(height > 0) || !Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error(phrase('error.unusableSize'));
  }
  if (!(percent > 0) || !Number.isFinite(percent)) throw new Error(phrase('error.percent'));
  return {
    width: Math.max(1, Math.round((width * percent) / 100)),
    height: Math.max(1, Math.round((height * percent) / 100)),
  };
}

export function exactPixelSize(width: number, height: number): { width: number; height: number } {
  if (!Number.isFinite(width) || !Number.isFinite(height)) throw new Error(phrase('error.widthHeight'));
  const roundedWidth = Math.round(width);
  const roundedHeight = Math.round(height);
  if (roundedWidth < 1 || roundedHeight < 1) throw new Error(phrase('error.minPixels'));
  if (roundedWidth > MAX_EDGE || roundedHeight > MAX_EDGE) {
    throw new Error(phrase('error.edgeMax', { edge: MAX_EDGE }));
  }
  return { width: roundedWidth, height: roundedHeight };
}
