import { phrase } from '../i18n/phrase';
import type { Rgba } from './bmp';

type TiffEncoder = {
  encodeImage(rgba: Uint8Array, width: number, height: number): ArrayBuffer;
};

export async function encodeTiffImage(image: Rgba): Promise<Uint8Array> {
  const { width, height, data } = image;
  if (width < 1 || height < 1 || data.length < width * height * 4) return new Uint8Array();
  const utif = await loadUtif();
  return new Uint8Array(utif.encodeImage(new Uint8Array(data), width, height));
}

async function loadUtif(): Promise<TiffEncoder> {
  const mod = await import('utif');
  const record = mod as { default?: TiffEncoder } & Partial<TiffEncoder>;
  const api = typeof record.encodeImage === 'function' ? record as TiffEncoder : record.default;
  if (!api?.encodeImage) throw new Error(phrase('error.tiffLoad'));
  return api;
}
