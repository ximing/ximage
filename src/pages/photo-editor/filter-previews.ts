import { FILTERS, type FilterId } from '../../tools/photo-editor/catalog';

const PREVIEW = 72;
const cache = new WeakMap<HTMLCanvasElement, Record<string, string>>();

/** Low-resolution JPEG previews of the editor filters. Cached per source canvas. */
export function filterPreviews(source: HTMLCanvasElement): Record<string, string> {
  const hit = cache.get(source);
  if (hit) return hit;
  const scale = PREVIEW / Math.max(source.width, source.height, 1);
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const base = document.createElement('canvas');
  base.width = width;
  base.height = height;
  const ctx = base.getContext('2d', { willReadFrequently: true });
  if (!ctx) return {};
  ctx.drawImage(source, 0, 0, width, height);
  const original = ctx.getImageData(0, 0, width, height);
  const urls: Record<string, string> = { '': paint(original, width, height, '') };
  for (const filter of FILTERS) {
    urls[filter.id] = paint(original, width, height, filter.id);
  }
  cache.set(source, urls);
  return urls;
}

function paint(
  source: ImageData,
  width: number,
  height: number,
  id: FilterId | '',
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const next = new ImageData(new Uint8ClampedArray(source.data), width, height);
  if (id) applyFilter(next.data, width, height, id);
  ctx.putImageData(next, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.72);
}

function applyFilter(data: Uint8ClampedArray, width: number, height: number, id: FilterId) {
  if (id === 'grayscale') {
    for (let index = 0; index < data.length; index += 4) {
      const tone = (data[index] + data[index + 1] + data[index + 2]) / 3;
      data[index] = tone;
      data[index + 1] = tone;
      data[index + 2] = tone;
    }
    return;
  }
  if (id === 'sepia') {
    for (let index = 0; index < data.length; index += 4) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      data[index] = clamp(red * 0.393 + green * 0.769 + blue * 0.189);
      data[index + 1] = clamp(red * 0.349 + green * 0.686 + blue * 0.168);
      data[index + 2] = clamp(red * 0.272 + green * 0.534 + blue * 0.131);
    }
    return;
  }
  if (id === 'invert') {
    for (let index = 0; index < data.length; index += 4) {
      data[index] = 255 - data[index];
      data[index + 1] = 255 - data[index + 1];
      data[index + 2] = 255 - data[index + 2];
    }
    return;
  }
  if (id === 'blur') {
    boxBlur(data, width, height, 1);
    return;
  }
  sharpen(data, width, height);
}

function boxBlur(data: Uint8ClampedArray, width: number, height: number, radius: number) {
  const copy = new Uint8ClampedArray(data);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let red = 0;
      let green = 0;
      let blue = 0;
      let count = 0;
      for (let dy = -radius; dy <= radius; dy += 1) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -radius; dx <= radius; dx += 1) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          const index = (yy * width + xx) * 4;
          red += copy[index];
          green += copy[index + 1];
          blue += copy[index + 2];
          count += 1;
        }
      }
      const index = (y * width + x) * 4;
      data[index] = red / count;
      data[index + 1] = green / count;
      data[index + 2] = blue / count;
    }
  }
}

function sharpen(data: Uint8ClampedArray, width: number, height: number) {
  const copy = new Uint8ClampedArray(data);
  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      let red = 0;
      let green = 0;
      let blue = 0;
      let k = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const index = ((y + dy) * width + (x + dx)) * 4;
          const weight = kernel[k];
          red += copy[index] * weight;
          green += copy[index + 1] * weight;
          blue += copy[index + 2] * weight;
          k += 1;
        }
      }
      const index = (y * width + x) * 4;
      data[index] = clamp(red);
      data[index + 1] = clamp(green);
      data[index + 2] = clamp(blue);
    }
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
