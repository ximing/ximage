export type CropRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const DEFAULT_CROP_PERCENT: CropRect = { x: 10, y: 10, width: 80, height: 80 };

export function clampCropRect(rect: CropRect, imageWidth: number, imageHeight: number): CropRect {
  const boundsWidth = Number.isFinite(imageWidth) ? Math.max(0, imageWidth) : 0;
  const boundsHeight = Number.isFinite(imageHeight) ? Math.max(0, imageHeight) : 0;
  const x = Number.isFinite(rect.x) ? rect.x : 0;
  const y = Number.isFinite(rect.y) ? rect.y : 0;
  const width = Number.isFinite(rect.width) ? rect.width : 0;
  const height = Number.isFinite(rect.height) ? rect.height : 0;
  const left = Math.min(x, x + width);
  const right = Math.max(x, x + width);
  const top = Math.min(y, y + height);
  const bottom = Math.max(y, y + height);
  const clampedLeft = clamp(left, 0, boundsWidth);
  const clampedTop = clamp(top, 0, boundsHeight);
  const clampedRight = clamp(right, 0, boundsWidth);
  const clampedBottom = clamp(bottom, 0, boundsHeight);
  return {
    x: clampedLeft,
    y: clampedTop,
    width: clampedRight - clampedLeft,
    height: clampedBottom - clampedTop,
  };
}

export function percentCropToPixels(percent: CropRect, imageWidth: number, imageHeight: number): CropRect {
  const x = Math.round((percent.x / 100) * imageWidth);
  const y = Math.round((percent.y / 100) * imageHeight);
  const right = Math.round(((percent.x + percent.width) / 100) * imageWidth);
  const bottom = Math.round(((percent.y + percent.height) / 100) * imageHeight);
  return clampCropRect({ x, y, width: right - x, height: bottom - y }, imageWidth, imageHeight);
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}
