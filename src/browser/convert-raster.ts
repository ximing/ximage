import { phrase } from '../i18n/phrase';
import { JPEG_QUALITY, type ConvertSource } from '../tools/convert-to-jpg/accept';
import type { ConvertOutput } from '../tools/convert/outputs';
import { encodeBmp } from './bmp';
import { decodeConvertSource } from './convert-to-jpeg';
import { encodeGif } from './gif-codec';
import { encodeJpeg, encodePng } from './raster';
import { encodeTiffImage } from './tiff';

const PNG_QUALITY = 80;
const WEBP_QUALITY = 80;

export type ConvertedRaster = {
  bytes: Uint8Array;
  width: number;
  height: number;
  note: string;
  preview: Blob | null;
};

export async function convertRaster(file: File, source: ConvertSource, output: ConvertOutput): Promise<ConvertedRaster> {
  const decoded = await decodeConvertSource(file, source);
  if (decoded.image.width < 1 || decoded.image.height < 1) throw new Error(phrase('error.notImage'));
  const bytes = await encodeOutput(decoded.image, output);
  if (bytes.byteLength === 0) throw new Error(phrase(emptyReason(output)));
  const preview = output === 'tiff' ? await pngPreview(decoded.image) : null;
  return {
    bytes,
    width: decoded.image.width,
    height: decoded.image.height,
    note: decoded.note,
    preview,
  };
}

async function encodeOutput(image: ImageData, output: ConvertOutput): Promise<Uint8Array> {
  switch (output) {
    case 'jpeg':
      return encodeJpeg(image, JPEG_QUALITY);
    case 'png':
      return encodePng(image, PNG_QUALITY);
    case 'webp':
      return encodeWebp(image);
    case 'gif':
      return encodeGif({
        width: image.width,
        height: image.height,
        frames: [{ data: image.data, delay: 100 }],
      }, 256);
    case 'bmp':
      return encodeBmp(image);
    case 'tiff':
      return encodeTiffImage(image);
  }
}

async function encodeWebp(image: ImageData): Promise<Uint8Array> {
  const { encode } = await import('@jsquash/webp');
  return new Uint8Array(await encode(image, { quality: WEBP_QUALITY }));
}

function emptyReason(output: ConvertOutput): 'error.jpgEmpty' | 'error.pngEmpty' | 'error.empty' {
  if (output === 'jpeg') return 'error.jpgEmpty';
  if (output === 'png') return 'error.pngEmpty';
  return 'error.empty';
}

function pngPreview(image: ImageData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (!context) return Promise.reject(new Error(phrase('error.canvas')));
  context.putImageData(image, 0, 0);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error(phrase('error.empty')));
    }, 'image/png');
  });
}
