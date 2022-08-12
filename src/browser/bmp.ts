export type Rgba = {
  width: number;
  height: number;
  data: Uint8ClampedArray;
};

type ChannelMasks = {
  red: number;
  green: number;
  blue: number;
  alpha: number;
};

const FILE_HEADER = 14;
const V4_HEADER = 108;

export function encodeBmp(image: Rgba): Uint8Array {
  const { width, height, data } = image;
  if (width < 1 || height < 1 || data.length < width * height * 4) return new Uint8Array();
  const pixelBytes = width * height * 4;
  const bytes = new Uint8Array(FILE_HEADER + V4_HEADER + pixelBytes);
  const view = new DataView(bytes.buffer);
  bytes[0] = 0x42;
  bytes[1] = 0x4d;
  view.setUint32(2, bytes.length, true);
  view.setUint32(10, FILE_HEADER + V4_HEADER, true);
  view.setUint32(14, V4_HEADER, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 32, true);
  view.setUint32(30, 3, true);
  view.setUint32(34, pixelBytes, true);
  view.setUint32(54, 0x00ff0000, true);
  view.setUint32(58, 0x0000ff00, true);
  view.setUint32(62, 0x000000ff, true);
  view.setUint32(66, 0xff000000, true);

  let offset = FILE_HEADER + V4_HEADER;
  for (let y = height - 1; y >= 0; y -= 1) {
    const row = y * width * 4;
    for (let x = 0; x < width; x += 1) {
      const index = row + x * 4;
      bytes[offset] = data[index + 2];
      bytes[offset + 1] = data[index + 1];
      bytes[offset + 2] = data[index];
      bytes[offset + 3] = data[index + 3];
      offset += 4;
    }
  }
  return bytes;
}

export function decodeBmp(bytes: Uint8Array): Rgba | null {
  if (bytes.length < FILE_HEADER + 40 || bytes[0] !== 0x42 || bytes[1] !== 0x4d) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const pixelOffset = view.getUint32(10, true);
  const dibSize = view.getUint32(14, true);
  if (dibSize < 40 || pixelOffset >= bytes.length) return null;
  const width = view.getInt32(18, true);
  const heightRaw = view.getInt32(22, true);
  const planes = view.getUint16(26, true);
  const bitCount = view.getUint16(28, true);
  const compression = view.getUint32(30, true);
  if (planes !== 1 || width < 1 || width > 65535) return null;
  const topDown = heightRaw < 0;
  const height = Math.abs(heightRaw);
  if (height < 1 || height > 65535) return null;
  if (bitCount !== 24 && bitCount !== 32) return null;
  if (bitCount === 24 && compression !== 0) return null;
  if (bitCount === 32 && compression !== 0 && compression !== 3 && compression !== 6) return null;

  const masks = bitCount === 24 ? null : readMasks(view, dibSize, compression, pixelOffset);
  if (bitCount === 32 && !masks) return null;
  const stride = bitCount === 24 ? Math.ceil((width * 3) / 4) * 4 : width * 4;
  if (pixelOffset + stride * height > bytes.length) return null;

  const data = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    const y = topDown ? row : height - 1 - row;
    const start = pixelOffset + row * stride;
    for (let x = 0; x < width; x += 1) {
      const dst = (y * width + x) * 4;
      if (bitCount === 24) {
        const index = start + x * 3;
        data[dst] = bytes[index + 2];
        data[dst + 1] = bytes[index + 1];
        data[dst + 2] = bytes[index];
        data[dst + 3] = 255;
      } else if (masks) {
        const pixel = view.getUint32(start + x * 4, true);
        data[dst] = maskValue(pixel, masks.red, 0);
        data[dst + 1] = maskValue(pixel, masks.green, 0);
        data[dst + 2] = maskValue(pixel, masks.blue, 0);
        data[dst + 3] = maskValue(pixel, masks.alpha, 255);
      }
    }
  }
  if (bitCount === 32 && compression === 0 && data.every((value, index) => index % 4 !== 3 || value === 0)) {
    for (let index = 3; index < data.length; index += 4) data[index] = 255;
  }
  return { width, height, data };
}

function readMasks(view: DataView, dibSize: number, compression: number, pixelOffset: number): ChannelMasks | null {
  if (compression === 0) {
    return { red: 0x00ff0000, green: 0x0000ff00, blue: 0x000000ff, alpha: 0xff000000 };
  }
  const maskAt = FILE_HEADER + 40;
  if (view.byteLength < maskAt + 12) return null;
  const red = view.getUint32(maskAt, true);
  const green = view.getUint32(maskAt + 4, true);
  const blue = view.getUint32(maskAt + 8, true);
  const hasAlpha = dibSize >= 56 || pixelOffset >= maskAt + 16;
  const alpha = hasAlpha && view.byteLength >= maskAt + 16 ? view.getUint32(maskAt + 12, true) : 0;
  if (red === 0 || green === 0 || blue === 0) return null;
  return { red, green, blue, alpha };
}

function maskValue(pixel: number, mask: number, fallback: number): number {
  if (mask === 0) return fallback;
  let shift = 0;
  let bits = mask;
  while ((bits & 1) === 0) {
    bits >>>= 1;
    shift += 1;
  }
  let width = 0;
  let probe = bits;
  while (probe & 1) {
    width += 1;
    probe >>>= 1;
  }
  const raw = (pixel & mask) >>> shift;
  if (width >= 8) return (raw >>> (width - 8)) & 255;
  const max = (1 << width) - 1;
  return max === 0 ? fallback : Math.round((raw / max) * 255);
}
