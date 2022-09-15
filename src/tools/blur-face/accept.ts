import { acceptImageFiles, type ImageKind } from '../../domain/accept-images';

export const BLUR_FACE_KINDS = ['jpeg', 'png'] as const satisfies readonly ImageKind[];

export function acceptBlurFaceFiles(files: readonly File[]) {
  return acceptImageFiles(files, BLUR_FACE_KINDS);
}
