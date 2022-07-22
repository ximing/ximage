import { decompressFrames, parseGIF, type ParsedFrame } from 'gifuct-js';
import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { yieldToUi } from '../domain/deadline';
import { fileToImageData } from './raster';
import { phrase } from '../i18n/phrase';

export type GifFrame = {
  data: Uint8ClampedArray;
  delay: number;
};

export type GifMovie = {
  width: number;
  height: number;
  frames: GifFrame[];
};

export async function openGif(file: File): Promise<{ movie: GifMovie; still: boolean }> {
  try {
    return { movie: await decodeGif(file), still: false };
  } catch {
    const still = await fileToImageData(file);
    return {
      movie: { width: still.width, height: still.height, frames: [{ data: still.data, delay: 100 }] },
      still: true,
    };
  }
}

export async function mapGif(
  movie: GifMovie,
  map: (image: ImageData, index: number) => Promise<ImageData> | ImageData,
  onFrame: (index: number, total: number) => void,
): Promise<GifMovie> {
  const frames: GifFrame[] = [];
  let width = 0;
  let height = 0;
  for (let index = 0; index < movie.frames.length; index += 1) {
    onFrame(index, movie.frames.length);
    const source = new ImageData(new Uint8ClampedArray(movie.frames[index].data), movie.width, movie.height);
    const image = await map(source, index);
    if (index === 0) {
      width = image.width;
      height = image.height;
    } else if (image.width !== width || image.height !== height) {
      throw new Error(phrase('error.gifFrameSize'));
    }
    frames.push({ data: image.data, delay: movie.frames[index].delay });
    await yieldToUi();
  }
  return { width, height, frames };
}

export function encodeGif(movie: GifMovie, colors: number): Uint8Array {
  if (movie.frames.length === 0 || movie.width < 1 || movie.height < 1) {
    throw new Error(phrase('error.gifNoPixels'));
  }
  const gif = GIFEncoder();
  movie.frames.forEach((frame, index) => {
    const transparent = hasTransparency(frame.data);
    const format = transparent ? 'rgba4444' : 'rgb565';
    const palette = quantize(frame.data, colors, { format, oneBitAlpha: transparent });
    if (palette.length === 0) throw new Error(phrase('error.gifEncode'));
    const indexed = applyPalette(frame.data, palette, format);
    const transparentIndex = transparent ? palette.findIndex((color) => (color[3] ?? 255) === 0) : -1;
    gif.writeFrame(indexed, movie.width, movie.height, {
      palette,
      delay: frame.delay > 0 ? frame.delay : 100,
      repeat: 0,
      transparent: transparentIndex >= 0,
      transparentIndex: transparentIndex >= 0 ? transparentIndex : 0,
      colorDepth: colorDepth(palette.length),
      first: index === 0,
    });
  });
  gif.finish();
  return gif.bytes();
}

async function decodeGif(file: File): Promise<GifMovie> {
  const parsed = parseGIF(await file.arrayBuffer());
  const frames = decompressFrames(parsed, true);
  if (parsed.lsd.width < 1 || parsed.lsd.height < 1 || frames.length === 0) {
    throw new Error(phrase('error.gifNoFrames'));
  }
  return composeFrames(parsed.lsd.width, parsed.lsd.height, frames);
}

function composeFrames(width: number, height: number, frames: readonly ParsedFrame[]): GifMovie {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error(phrase('error.canvas'));
  const patch = document.createElement('canvas');
  const patchContext = patch.getContext('2d');
  if (!patchContext) throw new Error(phrase('error.canvas'));
  const composed: GifFrame[] = [];
  for (const frame of frames) {
    const dims = frame.dims;
    let backup: ImageData | null = null;
    if (frame.disposalType === 3) backup = context.getImageData(0, 0, width, height);
    if (dims.width > 0 && dims.height > 0) {
      patch.width = dims.width;
      patch.height = dims.height;
      const pixels = new Uint8ClampedArray(frame.patch);
      patchContext.putImageData(new ImageData(pixels, dims.width, dims.height), 0, 0);
      context.drawImage(patch, dims.left, dims.top);
    }
    const snapshot = context.getImageData(0, 0, width, height);
    composed.push({
      data: new Uint8ClampedArray(snapshot.data),
      delay: frame.delay > 0 ? frame.delay : 100,
    });
    if (frame.disposalType === 2) context.clearRect(dims.left, dims.top, dims.width, dims.height);
    else if (frame.disposalType === 3 && backup) context.putImageData(backup, 0, 0);
  }
  return { width, height, frames: composed };
}

function hasTransparency(data: Uint8ClampedArray): boolean {
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 255) return true;
  }
  return false;
}

function colorDepth(paletteLength: number): number {
  let depth = 2;
  while (1 << depth < paletteLength && depth < 8) depth += 1;
  return depth;
}
