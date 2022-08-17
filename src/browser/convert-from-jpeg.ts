import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { phrase } from '../i18n/phrase';

export type RasterBytes = {
  bytes: Uint8Array;
  width: number;
  height: number;
  note: string;
};

export function imagesToAnimatedGif(frames: readonly ImageData[], delayMs: number, loop: boolean): RasterBytes {
  if (frames.length < 2) throw new Error(phrase('error.gifRequired'));
  const width = frames[0].width;
  const height = frames[0].height;
  let mixed = false;
  const normalized = frames.map((frame) => {
    if (frame.width !== width || frame.height !== height) mixed = true;
    return fitFrame(frame, width, height);
  });
  const bytes = encodeSequence(normalized, delayMs, loop);
  return {
    bytes,
    width,
    height,
    note: mixed ? phrase('note.scaledToFirst') : '',
  };
}

function fitFrame(image: ImageData, width: number, height: number): ImageData {
  if (image.width === width && image.height === height) return image;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = context2d(canvas);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(canvasFrom(image), 0, 0, width, height);
  return context.getImageData(0, 0, width, height);
}

function encodeSequence(frames: readonly ImageData[], delayMs: number, loop: boolean): Uint8Array {
  if (frames.length === 0 || frames[0].width < 1 || frames[0].height < 1) {
    throw new Error(phrase('error.noImages'));
  }
  const gif = GIFEncoder();
  frames.forEach((frame, index) => {
    if (frame.width !== frames[0].width || frame.height !== frames[0].height) {
      throw new Error(phrase('error.gifFrameMatch'));
    }
    const palette = quantize(frame.data, 256, { format: 'rgb565' });
    if (palette.length === 0) throw new Error(phrase('error.gifEncode'));
    const indexed = applyPalette(frame.data, palette, 'rgb565');
    gif.writeFrame(indexed, frame.width, frame.height, {
      palette,
      delay: delayMs,
      repeat: index === 0 ? (loop ? 0 : -1) : undefined,
    });
  });
  gif.finish();
  const bytes = gif.bytes();
  if (bytes.byteLength === 0) throw new Error(phrase('error.gifEncode'));
  return bytes;
}

function canvasFrom(image: ImageData): HTMLCanvasElement {
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
