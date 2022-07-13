import { alphaMask, type PixelImage } from '../domain/composite';
import { phrase } from '../i18n/phrase';

export async function decodeImage(blob: Blob): Promise<PixelImage> {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error(phrase('error.canvas'));
    context.drawImage(bitmap, 0, 0);
    const image = context.getImageData(0, 0, bitmap.width, bitmap.height);
    return { width: bitmap.width, height: bitmap.height, data: image.data };
  } finally {
    bitmap.close();
  }
}

export function encodePng(image: PixelImage): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error(phrase('error.canvas'));
  const copy = new Uint8ClampedArray(image.data);
  context.putImageData(new ImageData(copy, image.width, image.height), 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error(phrase('error.pngEncode')));
      else resolve(blob);
    }, 'image/png');
  });
}

export async function maskFromCutout(cutout: Blob, width: number, height: number): Promise<Uint8Array> {
  const image = await decodeImage(cutout);
  if (image.width !== width || image.height !== height) {
    throw new Error(phrase('error.cutoutSize'));
  }
  return alphaMask(image);
}
