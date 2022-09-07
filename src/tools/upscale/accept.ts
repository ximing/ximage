import { acceptImageFiles, type ImageKind } from '../../domain/accept-images';

export const UPSCALE_KINDS = ['jpeg', 'png'] as const satisfies readonly ImageKind[];

export function acceptUpscaleFiles(files: readonly File[]) {
  return acceptImageFiles(files, UPSCALE_KINDS);
}
