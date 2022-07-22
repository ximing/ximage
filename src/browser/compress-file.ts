import type { ImageKind } from '../domain/accept-images';
import { yieldToUi } from '../domain/deadline';
import { gifColorCount, svgFloatPrecision } from '../tools/compress/quality';
import { readSvgSize } from '../tools/resize/svg';
import { encodeGif, mapGif, openGif } from './gif-codec';
import type { Processed, ProgressFn } from './processed';
import { encodeJpeg, encodePng, fileToImageData } from './raster';
import { phrase } from '../i18n/phrase';

export async function compressFile(
  file: File,
  kind: ImageKind,
  quality: number,
  onProgress: ProgressFn,
): Promise<Processed> {
  onProgress(8, phrase('progress.compressing'));
  await yieldToUi();
  if (kind === 'svg') return compressSvg(file, quality);
  if (kind === 'gif') return compressGif(file, quality, onProgress);
  const image = await fileToImageData(file);
  onProgress(40, phrase('progress.compressing'));
  const bytes = kind === 'jpeg' ? await encodeJpeg(image, quality) : await encodePng(image, quality);
  return { bytes, width: image.width, height: image.height, still: false };
}

async function compressSvg(file: File, quality: number): Promise<Processed> {
  const { optimize } = await import('svgo/browser');
  const markup = await file.text();
  const result = optimize(markup, {
    multipass: quality < 90,
    floatPrecision: svgFloatPrecision(quality),
    js2svg: { pretty: false },
  });
  if (!result.data.includes('<svg')) throw new Error(phrase('error.svgCompress'));
  const size = readSvgSize(result.data) ?? readSvgSize(markup);
  return {
    bytes: new TextEncoder().encode(result.data),
    width: size ? Math.round(size.width) : 0,
    height: size ? Math.round(size.height) : 0,
    still: false,
  };
}

async function compressGif(file: File, quality: number, onProgress: ProgressFn): Promise<Processed> {
  const opened = await openGif(file);
  const movie = await mapGif(opened.movie, (image) => image, (index, total) => {
    onProgress(10 + Math.round((index / Math.max(total, 1)) * 70), phrase('progress.compressFrame', { index: index + 1, total }));
  });
  onProgress(88, phrase('progress.encodingGif'));
  return {
    bytes: encodeGif(movie, gifColorCount(quality)),
    width: movie.width,
    height: movie.height,
    still: opened.still,
  };
}
