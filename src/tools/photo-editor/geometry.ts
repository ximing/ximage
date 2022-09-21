import { phrase } from '../../i18n/phrase';
export type PixelSize = { width: number; height: number };

export type ResizeAxis = 'width' | 'height';

export type CropBox = { x: number; y: number; width: number; height: number };

export type TransformSpec = {
  quartersLeft: number;
  flipHorizontal: boolean;
  flipVertical: boolean;
};

export const CROP_RATIOS = [
  { label: '3:2', width: 3, height: 2 },
  { label: '5:3', width: 5, height: 3 },
  { label: '4:3', width: 4, height: 3 },
  { label: '5:4', width: 5, height: 4 },
  { label: '6:4', width: 6, height: 4 },
  { label: '7:5', width: 7, height: 5 },
  { label: '10:8', width: 10, height: 8 },
  { label: '16:9', width: 16, height: 9 },
] as const;

const MAX_EDGE = 8192;

export function identityTransform(): TransformSpec {
  return { quartersLeft: 0, flipHorizontal: false, flipVertical: false };
}

export function isIdentityTransform(spec: TransformSpec): boolean {
  return normalizeQuarters(spec.quartersLeft) === 0 && !spec.flipHorizontal && !spec.flipVertical;
}

export function lockedResize(
  sourceWidth: number,
  sourceHeight: number,
  requestedWidth: number,
  requestedHeight: number,
  lockAspect: boolean,
  edited: ResizeAxis,
): PixelSize {
  if (!(sourceWidth > 0) || !(sourceHeight > 0) || !Number.isFinite(sourceWidth) || !Number.isFinite(sourceHeight)) {
    throw new Error(phrase('error.unusableSize'));
  }
  if (lockAspect && edited === 'width') {
    const width = positiveEdge(requestedWidth, 'Width');
    const height = positiveEdge(Math.round((sourceHeight * width) / sourceWidth), 'Height');
    return { width, height };
  }
  if (lockAspect && edited === 'height') {
    const height = positiveEdge(requestedHeight, 'Height');
    const width = positiveEdge(Math.round((sourceWidth * height) / sourceHeight), 'Width');
    return { width, height };
  }
  return {
    width: positiveEdge(requestedWidth, 'Width'),
    height: positiveEdge(requestedHeight, 'Height'),
  };
}

export function clampEditorCrop(crop: CropBox, imageWidth: number, imageHeight: number): CropBox {
  const boundsWidth = Number.isFinite(imageWidth) ? Math.max(0, imageWidth) : 0;
  const boundsHeight = Number.isFinite(imageHeight) ? Math.max(0, imageHeight) : 0;
  const x = finite(crop.x);
  const y = finite(crop.y);
  const width = finite(crop.width);
  const height = finite(crop.height);
  const left = clamp(Math.min(x, x + width), 0, boundsWidth);
  const right = clamp(Math.max(x, x + width), 0, boundsWidth);
  const top = clamp(Math.min(y, y + height), 0, boundsHeight);
  const bottom = clamp(Math.max(y, y + height), 0, boundsHeight);
  const roundedLeft = Math.round(left);
  const roundedTop = Math.round(top);
  const roundedRight = Math.round(right);
  const roundedBottom = Math.round(bottom);
  return {
    x: roundedLeft,
    y: roundedTop,
    width: Math.max(0, roundedRight - roundedLeft),
    height: Math.max(0, roundedBottom - roundedTop),
  };
}

export function cropBoxForRatio(
  imageWidth: number,
  imageHeight: number,
  ratioWidth: number,
  ratioHeight: number,
): CropBox {
  if (!(imageWidth > 0) || !(imageHeight > 0) || !Number.isFinite(imageWidth) || !Number.isFinite(imageHeight)) {
    throw new Error(phrase('error.unusableSize'));
  }
  if (!(ratioWidth > 0) || !(ratioHeight > 0) || !Number.isFinite(ratioWidth) || !Number.isFinite(ratioHeight)) {
    throw new Error(phrase('error.ratio'));
  }
  const widthIfFullHeight = (imageHeight * ratioWidth) / ratioHeight;
  const width = widthIfFullHeight <= imageWidth ? widthIfFullHeight : imageWidth;
  const height = widthIfFullHeight <= imageWidth ? imageHeight : (imageWidth * ratioHeight) / ratioWidth;
  const boxWidth = Math.max(1, Math.floor(width));
  const boxHeight = Math.max(1, Math.floor(height));
  return clampEditorCrop({
    x: Math.max(0, Math.floor((imageWidth - boxWidth) / 2)),
    y: Math.max(0, Math.floor((imageHeight - boxHeight) / 2)),
    width: boxWidth,
    height: boxHeight,
  }, imageWidth, imageHeight);
}

export function rotateLeftSize(width: number, height: number): PixelSize {
  if (!(width > 0) || !(height > 0) || !Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error(phrase('error.unusableSize'));
  }
  return { width: Math.round(height), height: Math.round(width) };
}

export function transformedSize(width: number, height: number, spec: TransformSpec): PixelSize {
  let size = rotateLeftSize(width, height);
  size = rotateLeftSize(size.width, size.height);
  const turns = normalizeQuarters(spec.quartersLeft);
  for (let index = 0; index < turns; index += 1) size = rotateLeftSize(size.width, size.height);
  return size;
}

export function framePixels(size: number): number {
  if (!Number.isFinite(size)) return 0;
  return Math.max(0, Math.min(200, Math.round(size)));
}

export function framedSize(width: number, height: number, size: number): PixelSize {
  const border = framePixels(size);
  return {
    width: Math.round(width) + border * 2,
    height: Math.round(height) + border * 2,
  };
}

export function clampedRadius(radius: number, width: number, height: number): number {
  if (!Number.isFinite(radius) || !(width > 0) || !(height > 0)) return 0;
  const limit = Math.min(width, height) / 2;
  return Math.min(limit, Math.max(0, Math.round(radius)));
}

function positiveEdge(value: number, label: string): number {
  const width = label === 'Width';
  if (!Number.isFinite(value)) throw new Error(phrase(width ? 'error.enterWidth' : 'error.enterHeight'));
  const rounded = Math.round(value);
  if (rounded < 1) throw new Error(phrase(width ? 'error.minWidth' : 'error.minHeight'));
  if (rounded > MAX_EDGE) throw new Error(phrase(width ? 'error.maxWidth' : 'error.maxHeight', { edge: MAX_EDGE }));
  return rounded;
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(max, Math.max(min, value));
}

function normalizeQuarters(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return ((Math.trunc(value) % 4) + 4) % 4;
}
