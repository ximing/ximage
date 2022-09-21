import type { CropBox, TransformSpec } from '../tools/photo-editor/geometry';
import { phrase } from '../i18n/phrase';

export async function fileToCanvas(file: File): Promise<HTMLCanvasElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      try {
        return paintSource(bitmap, bitmap.width, bitmap.height);
      } finally {
        bitmap.close();
      }
    } catch {
      // The image element can still decode some files createImageBitmap rejects.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    return paintSource(image, image.naturalWidth, image.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  return paintSource(source, source.width, source.height);
}

export function paintSource(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  if (!(width > 0) || !(height > 0)) throw new Error(phrase('error.noPixels'));
  const next = document.createElement('canvas');
  next.width = Math.round(width);
  next.height = Math.round(height);
  const ctx = mustContext(next);
  const size = sourcePixelSize(source);
  if (size && size.width === next.width && size.height === next.height) ctx.drawImage(source, 0, 0);
  else ctx.drawImage(source, 0, 0, next.width, next.height);
  return next;
}

export function resizeCanvas(source: HTMLCanvasElement, width: number, height: number): HTMLCanvasElement {
  if (!(width > 0) || !(height > 0)) throw new Error(phrase('error.minPixels'));
  const next = document.createElement('canvas');
  next.width = width;
  next.height = height;
  const ctx = mustContext(next);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  return next;
}

export function cropCanvas(source: HTMLCanvasElement, box: CropBox): HTMLCanvasElement {
  if (!(box.width > 0) || !(box.height > 0)) throw new Error(phrase('error.cropOutside'));
  const next = document.createElement('canvas');
  next.width = box.width;
  next.height = box.height;
  const ctx = mustContext(next);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
  return next;
}

export function renderTransform(source: HTMLCanvasElement, spec: TransformSpec): HTMLCanvasElement {
  let current = source;
  if (spec.flipHorizontal) current = flipCanvas(current, 'horizontal');
  if (spec.flipVertical) current = flipCanvas(current, 'vertical');
  const turns = ((Math.trunc(spec.quartersLeft) % 4) + 4) % 4;
  for (let index = 0; index < turns; index += 1) current = rotateLeftCanvas(current);
  return current === source ? cloneCanvas(source) : current;
}

export function frameCanvas(source: HTMLCanvasElement, padding: number, color: string): HTMLCanvasElement {
  const border = Math.max(0, Math.round(padding));
  const next = document.createElement('canvas');
  next.width = source.width + border * 2;
  next.height = source.height + border * 2;
  const ctx = mustContext(next);
  ctx.fillStyle = color || '#172033';
  ctx.fillRect(0, 0, next.width, next.height);
  ctx.drawImage(source, border, border);
  return next;
}

export function roundCornersCanvas(source: HTMLCanvasElement, radius: number): HTMLCanvasElement {
  const next = document.createElement('canvas');
  next.width = source.width;
  next.height = source.height;
  const ctx = mustContext(next);
  traceRoundRect(ctx, next.width, next.height, radius);
  ctx.clip();
  ctx.drawImage(source, 0, 0);
  return next;
}

export function canvasToBlob(source: HTMLCanvasElement, format: 'png' | 'jpg'): Promise<Blob> {
  // JPEG has no alpha. Leaving the corners transparent would encode them as black.
  const canvas = format === 'jpg' ? compositeOnWhite(source) : source;
  const type = format === 'jpg' ? 'image/jpeg' : 'image/png';
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error(phrase('error.encode')));
      else resolve(blob);
    }, type, 0.92);
  });
}

function compositeOnWhite(source: HTMLCanvasElement): HTMLCanvasElement {
  const next = document.createElement('canvas');
  next.width = source.width;
  next.height = source.height;
  const ctx = mustContext(next);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, next.width, next.height);
  ctx.drawImage(source, 0, 0);
  return next;
}

function rotateLeftCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const next = document.createElement('canvas');
  next.width = source.height;
  next.height = source.width;
  const ctx = mustContext(next);
  ctx.imageSmoothingEnabled = false;
  ctx.translate(0, next.height);
  ctx.rotate(-Math.PI / 2);
  ctx.drawImage(source, 0, 0);
  return next;
}

function flipCanvas(source: HTMLCanvasElement, axis: 'horizontal' | 'vertical'): HTMLCanvasElement {
  const next = document.createElement('canvas');
  next.width = source.width;
  next.height = source.height;
  const ctx = mustContext(next);
  ctx.imageSmoothingEnabled = false;
  if (axis === 'horizontal') {
    ctx.translate(next.width, 0);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(0, next.height);
    ctx.scale(1, -1);
  }
  ctx.drawImage(source, 0, 0);
  return next;
}

function traceRoundRect(ctx: CanvasRenderingContext2D, width: number, height: number, radius: number) {
  const limit = Math.min(width / 2, height / 2);
  const r = Math.min(limit, Math.max(0, radius));
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.arcTo(width, 0, width, height, r);
  ctx.arcTo(width, height, 0, height, r);
  ctx.arcTo(0, height, 0, 0, r);
  ctx.arcTo(0, 0, width, 0, r);
  ctx.closePath();
}

function sourcePixelSize(source: CanvasImageSource): { width: number; height: number } | null {
  if (source instanceof HTMLCanvasElement) return { width: source.width, height: source.height };
  if (source instanceof HTMLImageElement) return { width: source.naturalWidth, height: source.naturalHeight };
  if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
    return { width: source.width, height: source.height };
  }
  return null;
}

function mustContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error(phrase('error.edit'));
  return ctx;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(phrase('error.read')));
    image.src = url;
  });
}
