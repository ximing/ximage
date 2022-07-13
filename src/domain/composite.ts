import { phrase } from '../i18n/phrase';
export type Rgba = {
  r: number;
  g: number;
  b: number;
};

export type PixelImage = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

export function parseCssColor(value: string): Rgba {
  const hex = value.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) {
    throw new Error(phrase('error.hex'));
  }
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

export function alphaMask(image: PixelImage): Uint8Array {
  const mask = new Uint8Array(image.width * image.height);
  for (let index = 0; index < mask.length; index += 1) {
    mask[index] = image.data[index * 4 + 3];
  }
  return mask;
}

/**
 * `background === null` keeps a transparent background.
 * A color fills only the background; fully covered subject pixels keep their RGB.
 */
export function compositeSubject(
  source: PixelImage,
  mask: Uint8Array,
  background: Rgba | null,
): PixelImage {
  const count = source.width * source.height;
  if (mask.length !== count) {
    throw new Error(phrase('error.maskSize'));
  }
  const data = new Uint8ClampedArray(source.data.length);
  for (let index = 0; index < count; index += 1) {
    const offset = index * 4;
    const coverage = mask[index] / 255;
    const red = source.data[offset];
    const green = source.data[offset + 1];
    const blue = source.data[offset + 2];
    if (background === null) {
      data[offset] = red;
      data[offset + 1] = green;
      data[offset + 2] = blue;
      data[offset + 3] = mask[index];
      continue;
    }
    data[offset] = Math.round(red * coverage + background.r * (1 - coverage));
    data[offset + 1] = Math.round(green * coverage + background.g * (1 - coverage));
    data[offset + 2] = Math.round(blue * coverage + background.b * (1 - coverage));
    data[offset + 3] = 255;
  }
  return { width: source.width, height: source.height, data };
}
