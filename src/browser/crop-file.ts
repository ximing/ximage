import type { ImageKind } from '../domain/accept-images';
import { yieldToUi } from '../domain/deadline';
import { gifColorCount } from '../tools/compress/quality';
import { percentCropToPixels, type CropRect } from '../tools/crop/rect';
import { encodeGif, mapGif, openGif } from './gif-codec';
import type { Processed, ProgressFn } from './processed';
import { cropImageData, encodeJpeg, encodePng, fileToImageData } from './raster';
import { phrase } from '../i18n/phrase';

export async function cropFile(
  file: File,
  kind: ImageKind,
  percent: CropRect,
  onProgress: ProgressFn,
): Promise<Processed> {
  onProgress(8, phrase('progress.cropping'));
  await yieldToUi();
  if (kind === 'gif') return cropGif(file, percent, onProgress);
  const image = await fileToImageData(file);
  const rect = percentCropToPixels(percent, image.width, image.height);
  const cropped = cropImageData(image, rect);
  onProgress(55, phrase('progress.cropping'));
  const bytes = kind === 'jpeg' ? await encodeJpeg(cropped, 92) : await encodePng(cropped, 80);
  return { bytes, width: cropped.width, height: cropped.height, still: false };
}

async function cropGif(file: File, percent: CropRect, onProgress: ProgressFn): Promise<Processed> {
  const opened = await openGif(file);
  const rect = percentCropToPixels(percent, opened.movie.width, opened.movie.height);
  const movie = await mapGif(
    opened.movie,
    (image) => cropImageData(image, rect),
    (index, total) => {
      onProgress(10 + Math.round((index / Math.max(total, 1)) * 70), phrase('progress.cropFrame', { index: index + 1, total }));
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
