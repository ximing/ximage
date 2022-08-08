import type { ImageKind } from '../domain/accept-images';
import { yieldToUi } from '../domain/deadline';
import { gifColorCount } from '../tools/compress/quality';
import { encodeGif, mapGif, openGif } from './gif-codec';
import type { Processed, ProgressFn } from './processed';
import { encodeJpeg, encodePng, fileToImageData, rotateImageData } from './raster';
import { phrase } from '../i18n/phrase';

export async function rotateFile(
  file: File,
  kind: ImageKind,
  degrees: number,
  onProgress: ProgressFn,
): Promise<Processed> {
  onProgress(8, phrase('progress.rotating'));
  await yieldToUi();
  if (kind === 'gif') return rotateGif(file, degrees, onProgress);
  const image = await fileToImageData(file);
  const rotated = rotateImageData(image, degrees, kind === 'jpeg' ? 'white' : 'clear');
  onProgress(50, phrase('progress.rotating'));
  const bytes = kind === 'jpeg' ? await encodeJpeg(rotated, 92) : await encodePng(rotated, 80);
  return { bytes, width: rotated.width, height: rotated.height, still: false };
}

async function rotateGif(file: File, degrees: number, onProgress: ProgressFn): Promise<Processed> {
  const opened = await openGif(file);
  const movie = await mapGif(
    opened.movie,
    (image) => rotateImageData(image, degrees, 'clear'),
    (index, total) => {
      onProgress(10 + Math.round((index / Math.max(total, 1)) * 70), phrase('progress.rotateFrame', { index: index + 1, total }));
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
