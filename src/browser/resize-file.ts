import type { ImageKind } from '../domain/accept-images';
import { yieldToUi } from '../domain/deadline';
import { gifColorCount } from '../tools/compress/quality';
import { MAX_EDGE, exactPixelSize, scaleDimensions } from '../tools/resize/scale';
import { readSvgSize, resizeSvgMarkup } from '../tools/resize/svg';
import { encodeGif, mapGif, openGif } from './gif-codec';
import type { Processed, ProgressFn } from './processed';
import { encodeJpeg, encodePng, fileToImageData, resizeRaster } from './raster';
import { phrase } from '../i18n/phrase';

export type ResizeRequest =
  | { mode: 'pixels'; width: number; height: number }
  | { mode: 'percent'; percent: number };

export async function resizeFile(
  file: File,
  kind: ImageKind,
  request: ResizeRequest,
  onProgress: ProgressFn,
): Promise<Processed> {
  onProgress(8, phrase('progress.resizing'));
  await yieldToUi();
  if (kind === 'svg') return resizeSvg(file, request);
  if (kind === 'gif') return resizeGif(file, request, onProgress);
  const image = await fileToImageData(file);
  const target = targetSize(request, image.width, image.height);
  onProgress(35, phrase('progress.resizing'));
  const resized = await resizeRaster(image, target.width, target.height);
  const bytes = kind === 'jpeg' ? await encodeJpeg(resized, 90) : await encodePng(resized, 80);
  return { bytes, width: resized.width, height: resized.height, still: false };
}

async function resizeSvg(file: File, request: ResizeRequest): Promise<Processed> {
  const markup = await file.text();
  const current = readSvgSize(markup);
  const target = request.mode === 'pixels' ? exactPixelSize(request.width, request.height) : scaleSvg(current, request.percent);
  const next = resizeSvgMarkup(markup, target.width, target.height);
  return {
    bytes: new TextEncoder().encode(next),
    width: target.width,
    height: target.height,
    still: false,
  };
}

function scaleSvg(current: { width: number; height: number } | null, percent: number) {
  if (!current) throw new Error(phrase('error.svgSize'));
  return scaleDimensions(current.width, current.height, percent);
}

async function resizeGif(file: File, request: ResizeRequest, onProgress: ProgressFn): Promise<Processed> {
  const opened = await openGif(file);
  const target = targetSize(request, opened.movie.width, opened.movie.height);
  const movie = await mapGif(
    opened.movie,
    (image) => resizeRaster(image, target.width, target.height),
    (index, total) => {
      onProgress(10 + Math.round((index / Math.max(total, 1)) * 70), phrase('progress.resizeFrame', { index: index + 1, total }));
    },
  );
  onProgress(88, phrase('progress.encodingGif'));
  return {
    bytes: encodeGif(movie, gifColorCount(80)),
    width: movie.width,
    height: movie.height,
    still: opened.still,
  };
}

function targetSize(request: ResizeRequest, width: number, height: number) {
  const size = request.mode === 'percent'
    ? scaleDimensions(width, height, request.percent)
    : exactPixelSize(request.width, request.height);
  if (size.width > MAX_EDGE || size.height > MAX_EDGE) {
    throw new Error(phrase('error.tooLarge', { edge: MAX_EDGE }));
  }
  return size;
}
