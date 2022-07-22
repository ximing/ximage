import { clampCropRect, type CropRect } from '../tools/crop/rect';
import { normalizeDegrees, quarterTurns, rotatedDimensions } from '../tools/rotate/geometry';
import { pngEffort } from '../tools/compress/quality';
import { phrase } from '../i18n/phrase';

export async function fileToImageData(file: Blob): Promise<ImageData> {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = context2d(canvas);
    context.drawImage(bitmap, 0, 0);
    return context.getImageData(0, 0, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

export function cropImageData(image: ImageData, rect: CropRect): ImageData {
  const clamped = clampCropRect(rect, image.width, image.height);
  if (clamped.width < 1 || clamped.height < 1) throw new Error(phrase('error.cropPixels'));
  const out = new Uint8ClampedArray(clamped.width * clamped.height * 4);
  for (let y = 0; y < clamped.height; y += 1) {
    const srcStart = ((clamped.y + y) * image.width + clamped.x) * 4;
    out.set(image.data.subarray(srcStart, srcStart + clamped.width * 4), y * clamped.width * 4);
  }
  return new ImageData(out, clamped.width, clamped.height);
}

export function rotateImageData(image: ImageData, degrees: number, background: 'white' | 'clear'): ImageData {
  const size = rotatedDimensions(image.width, image.height, degrees);
  const source = canvasFromImage(image);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const context = context2d(canvas);
  if (background === 'white') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  const quarter = quarterTurns(degrees);
  if (quarter === 1) {
    context.translate(size.width, 0);
    context.rotate(Math.PI / 2);
    context.drawImage(source, 0, 0);
  } else if (quarter === 2) {
    context.translate(size.width, size.height);
    context.rotate(Math.PI);
    context.drawImage(source, 0, 0);
  } else if (quarter === 3) {
    context.translate(0, size.height);
    context.rotate(-Math.PI / 2);
    context.drawImage(source, 0, 0);
  } else if (quarter === 0) {
    context.drawImage(source, 0, 0);
  } else {
    context.translate(size.width / 2, size.height / 2);
    context.rotate((normalizeDegrees(degrees) * Math.PI) / 180);
    context.drawImage(source, -image.width / 2, -image.height / 2);
  }
  return context.getImageData(0, 0, size.width, size.height);
}

export async function resizeRaster(image: ImageData, width: number, height: number): Promise<ImageData> {
  if (image.width === width && image.height === height) return image;
  const source = canvasFromImage(image);
  const dest = document.createElement('canvas');
  dest.width = width;
  dest.height = height;
  const destContext = context2d(dest);
  try {
    const resizer = await picaResizer();
    await resizer.resize(source, dest);
  } catch {
    destContext.imageSmoothingEnabled = true;
    destContext.imageSmoothingQuality = 'high';
    destContext.drawImage(source, 0, 0, width, height);
  }
  return destContext.getImageData(0, 0, width, height);
}

function picaResizer() {
  if (!resizer) {
    resizer = import('pica').then(({ default: createPica }) => createPica());
  }
  return resizer;
}

let resizer: Promise<{ resize: (from: HTMLCanvasElement, to: HTMLCanvasElement) => Promise<HTMLCanvasElement> }> | null = null;

export async function encodeJpeg(image: ImageData, quality: number): Promise<Uint8Array> {
  const { encode } = await import('@jsquash/jpeg');
  const buffer = await encode(flattenOnWhite(image), { quality });
  return new Uint8Array(buffer);
}

export async function encodePng(image: ImageData, quality: number): Promise<Uint8Array> {
  const { optimise } = await import('@jsquash/oxipng');
  const buffer = await optimise(image, { level: pngEffort(quality), interlace: false, optimiseAlpha: true });
  return new Uint8Array(buffer);
}

function canvasFromImage(image: ImageData): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  context2d(canvas).putImageData(image, 0, 0);
  return canvas;
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error(phrase('error.canvas'));
  return context;
}

function flattenOnWhite(image: ImageData): ImageData {
  const out = new Uint8ClampedArray(image.data);
  for (let index = 0; index < out.length; index += 4) {
    const alpha = out[index + 3] / 255;
    if (alpha >= 1) continue;
    out[index] = Math.round(out[index] * alpha + 255 * (1 - alpha));
    out[index + 1] = Math.round(out[index + 1] * alpha + 255 * (1 - alpha));
    out[index + 2] = Math.round(out[index + 2] * alpha + 255 * (1 - alpha));
    out[index + 3] = 255;
  }
  return new ImageData(out, image.width, image.height);
}
