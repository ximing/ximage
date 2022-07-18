import type { ImageKind } from '../domain/accept-images';
import { readSvgSize, type SvgSize } from '../tools/resize/svg';

export async function measureFile(file: File, kind: ImageKind): Promise<SvgSize | null> {
  if (kind === 'svg') return readSvgSize(await file.text());
  const bitmap = await createImageBitmap(file);
  try {
    return { width: bitmap.width, height: bitmap.height };
  } finally {
    bitmap.close();
  }
}
