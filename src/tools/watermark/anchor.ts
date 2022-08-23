import { phrase } from '../../i18n/phrase';
export const WATERMARK_FONTS = [
  'Arial',
  'Impact',
  'Verdana',
  'Courier New',
  'Comic Sans MS',
  'Times New Roman',
] as const;

export const WATERMARK_POSITIONS = [
  'top-left',
  'top-center',
  'top-right',
  'center',
  'bottom-left',
  'bottom-center',
  'bottom-right',
] as const;

export type WatermarkFont = (typeof WATERMARK_FONTS)[number];
export type WatermarkPosition = (typeof WATERMARK_POSITIONS)[number];

export const WATERMARK_POSITION_LABELS: Record<WatermarkPosition, string> = {
  'top-left': 'Top left',
  'top-center': 'Top center',
  'top-right': 'Top right',
  center: 'Center',
  'bottom-left': 'Bottom left',
  'bottom-center': 'Bottom center',
  'bottom-right': 'Bottom right',
};

export function watermarkFont(value: string): WatermarkFont {
  const fonts: readonly string[] = WATERMARK_FONTS;
  return fonts.includes(value) ? (value as WatermarkFont) : 'Arial';
}

export function watermarkPosition(value: string): WatermarkPosition {
  const positions: readonly string[] = WATERMARK_POSITIONS;
  return positions.includes(value) ? (value as WatermarkPosition) : 'center';
}

export function clampFontSize(value: number): number {
  if (!Number.isFinite(value)) throw new Error(phrase('error.fontSize'));
  const size = Math.round(value);
  if (size < 1 || size > 400) throw new Error(phrase('error.fontRange'));
  return size;
}

export function clampOpacity(value: number): number {
  if (!Number.isFinite(value)) throw new Error(phrase('error.opacity'));
  const opacity = Math.round(value);
  if (opacity < 0 || opacity > 100) throw new Error(phrase('error.opacityRange'));
  return opacity;
}

export function opacityAlpha(opacity: number): number {
  return clampOpacity(opacity) / 100;
}

/** Top-left of `box` on `image`. `margin` insets the corners; center ignores it. */
export function watermarkAnchor(
  imageWidth: number,
  imageHeight: number,
  boxWidth: number,
  boxHeight: number,
  position: WatermarkPosition,
  margin = 0,
): { x: number; y: number } {
  return {
    x: align(imageWidth, boxWidth, margin, xEdge(position)),
    y: align(imageHeight, boxHeight, margin, yEdge(position)),
  };
}

export function fittedMarkSize(
  imageWidth: number,
  imageHeight: number,
  markWidth: number,
  markHeight: number,
): { width: number; height: number } {
  if (markWidth < 1 || markHeight < 1) throw new Error(phrase('error.markPixels'));
  const scale = Math.min(1, imageWidth / markWidth, imageHeight / markHeight);
  return {
    width: Math.max(1, Math.round(markWidth * scale)),
    height: Math.max(1, Math.round(markHeight * scale)),
  };
}

export function cssFont(font: string, fontSize: number): string {
  const family = font.includes(' ') ? `"${font}", sans-serif` : `${font}, sans-serif`;
  return `${fontSize}px ${family}`;
}

function align(outer: number, inner: number, margin: number, edge: 'start' | 'center' | 'end'): number {
  const limit = Math.max(0, outer - inner);
  if (edge === 'center') return Math.min(limit, Math.max(0, Math.round((outer - inner) / 2)));
  const value = edge === 'start' ? margin : outer - inner - margin;
  return Math.min(limit, Math.max(0, Math.round(value)));
}

function xEdge(position: WatermarkPosition): 'start' | 'center' | 'end' {
  if (position === 'center' || position.endsWith('center')) return 'center';
  if (position.endsWith('right')) return 'end';
  return 'start';
}

function yEdge(position: WatermarkPosition): 'start' | 'center' | 'end' {
  if (position === 'center') return 'center';
  if (position.startsWith('bottom')) return 'end';
  return 'start';
}
