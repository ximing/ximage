import type { ImageKind } from '../domain/accept-images';
import { encodeGif, mapGif, openGif } from './gif-codec';
import { encodeJpeg, encodePng, fileToImageData } from './raster';
import {
  captionBandHeight,
  memeBandPad,
  memeFontSize,
  memeLineHeight,
  textOutsideHeight,
  type MemePlacement,
} from '../tools/meme/layout';
import { phrase } from '../i18n/phrase';
import {
  clampFontSize,
  cssFont,
  fittedMarkSize,
  opacityAlpha,
  watermarkAnchor,
  watermarkFont,
  watermarkPosition,
  type WatermarkPosition,
} from '../tools/watermark/anchor';

export type StampOptions = {
  text: string;
  font: string;
  fontSize: number;
  opacity: number;
  position: WatermarkPosition;
  mark: ImageData | null;
};

export type MemeOptions = {
  top: string;
  bottom: string;
  placement: MemePlacement;
};

export type Decorated = {
  bytes: Uint8Array;
  width: number;
  height: number;
  note: string;
};

export async function watermarkFile(file: File, kind: ImageKind, options: StampOptions): Promise<Decorated> {
  return decorateFile(file, kind, (image) => drawWatermark(image, options), 'watermarked');
}

export async function memeFile(file: File, kind: ImageKind, options: MemeOptions): Promise<Decorated> {
  return decorateFile(file, kind, (image) => drawMeme(image, options), 'captioned');
}

async function decorateFile(
  file: File,
  kind: ImageKind,
  draw: (image: ImageData) => ImageData,
  verb: string,
): Promise<Decorated> {
  if (kind === 'gif') {
    const opened = await openGif(file);
    const movie = await mapGif(opened.movie, (frame) => draw(frame), () => undefined);
    return {
      bytes: encodeGif(movie, 256),
      width: movie.width,
      height: movie.height,
      note: opened.still ? verb === 'watermarked' ? phrase('note.gifStillWatermark') : phrase('note.gifStillCaption') : '',
    };
  }
  const image = draw(await fileToImageData(file));
  const bytes = kind === 'jpeg' ? await encodeJpeg(image, 92) : await encodePng(image, 80);
  if (bytes.byteLength === 0) throw new Error(phrase('error.empty'));
  return { bytes, width: image.width, height: image.height, note: '' };
}

export function drawWatermark(image: ImageData, options: StampOptions): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = context2d(canvas);
  context.putImageData(image, 0, 0);
  const alpha = opacityAlpha(options.opacity);
  const position = watermarkPosition(options.position);
  const margin = Math.round(Math.min(image.width, image.height) * 0.02);
  context.save();
  context.globalAlpha = alpha;
  if (options.mark) {
    const box = fittedMarkSize(image.width, image.height, options.mark.width, options.mark.height);
    const origin = watermarkAnchor(image.width, image.height, box.width, box.height, position, margin);
    context.drawImage(canvasFrom(options.mark), origin.x, origin.y, box.width, box.height);
  }
  const text = options.text.trim();
  if (text) {
    const fontSize = clampFontSize(options.fontSize);
    context.font = cssFont(watermarkFont(options.font), fontSize);
    context.textAlign = 'left';
    context.textBaseline = 'top';
    context.lineJoin = 'round';
    context.miterLimit = 2;
    context.lineWidth = Math.max(2, Math.round(fontSize / 8));
    const maxWidth = Math.max(1, image.width - margin * 2);
    const lines = wrapLines(text, maxWidth, (line) => context.measureText(line).width);
    const lineHeight = Math.round(fontSize * 1.2);
    const boxWidth = Math.max(1, ...lines.map((line) => Math.ceil(context.measureText(line).width)));
    const boxHeight = Math.max(lineHeight, lines.length * lineHeight);
    const origin = watermarkAnchor(image.width, image.height, boxWidth, boxHeight, position, margin);
    lines.forEach((line, index) => {
      const y = origin.y + index * lineHeight;
      context.strokeStyle = '#111111';
      context.strokeText(line, origin.x, y);
      context.fillStyle = '#ffffff';
      context.fillText(line, origin.x, y);
    });
  }
  context.restore();
  return context.getImageData(0, 0, image.width, image.height);
}

export function drawMeme(image: ImageData, options: MemeOptions): ImageData {
  const fontSize = memeFontSize(image.width);
  const measureCanvas = document.createElement('canvas');
  const measure = context2d(measureCanvas);
  measure.font = `${fontSize}px Impact, "Arial Black", sans-serif`;
  const maxWidth = Math.max(1, image.width - memeBandPad(fontSize) * 2);
  const topLines = wrapLines(options.top, maxWidth, (line) => measure.measureText(line).width);
  const bottomLines = wrapLines(options.bottom, maxWidth, (line) => measure.measureText(line).width);
  const topBand = options.placement === 'outside' ? captionBandHeight(topLines.length, fontSize) : 0;
  const bottomBand = options.placement === 'outside' ? captionBandHeight(bottomLines.length, fontSize) : 0;
  const height = options.placement === 'outside' ? textOutsideHeight(image.height, topBand, bottomBand) : image.height;
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = height;
  const context = context2d(canvas);
  if (options.placement === 'outside') {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(canvasFrom(image), 0, topBand);
  context.font = `${fontSize}px Impact, "Arial Black", sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'top';
  context.lineJoin = 'round';
  context.miterLimit = 2;
  const x = image.width / 2;
  if (options.placement === 'inside') {
    paintInside(context, topLines, x, memeBandPad(fontSize), fontSize);
    const bottomBlock = captionBandHeight(bottomLines.length, fontSize);
    paintInside(context, bottomLines, x, image.height - bottomBlock + memeBandPad(fontSize), fontSize);
  } else {
    paintOutside(context, topLines, x, memeBandPad(fontSize), fontSize);
    paintOutside(context, bottomLines, x, topBand + image.height + memeBandPad(fontSize), fontSize);
  }
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function paintInside(context: CanvasRenderingContext2D, lines: readonly string[], x: number, y: number, fontSize: number) {
  context.lineWidth = Math.max(2, Math.round(fontSize / 6));
  context.strokeStyle = '#111111';
  context.fillStyle = '#ffffff';
  const lineHeight = memeLineHeight(fontSize);
  lines.forEach((line, index) => {
    const lineY = y + index * lineHeight;
    context.strokeText(line, x, lineY);
    context.fillText(line, x, lineY);
  });
}

function paintOutside(context: CanvasRenderingContext2D, lines: readonly string[], x: number, y: number, fontSize: number) {
  context.fillStyle = '#111111';
  const lineHeight = memeLineHeight(fontSize);
  lines.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
}

function wrapLines(text: string, maxWidth: number, measure: (line: string) => number): string[] {
  const source = text.trim();
  if (!source) return [];
  const lines: string[] = [];
  for (const paragraph of source.split(/\n/u)) {
    const words = paragraph.split(/\s+/u).filter(Boolean);
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (line && measure(next) > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
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
