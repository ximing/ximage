import { phrase } from '../../i18n/phrase';
import type { ConvertOutput } from '../convert/outputs';
import { acceptConvertToJpg } from '../convert-to-jpg/accept';

export type JpgOutput = ConvertOutput;
export type GifMotion = 'static' | 'animated';

export const ANIMATED_GIF_REQUIRED = phrase('error.gifRequired');

export function acceptConvertFromJpg(files: readonly File[]) {
  return acceptConvertToJpg(files);
}

export function animatedGifEnabled(imageCount: number): boolean {
  return imageCount >= 2;
}

/** GIF delay in milliseconds. gifenc converts that to centiseconds. */
export function gifFrameDelay(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 60) {
    throw new Error(phrase('error.secondsRange'));
  }
  return Math.max(10, Math.round(seconds * 1000));
}
