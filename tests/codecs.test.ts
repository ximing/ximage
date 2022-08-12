import { describe, expect, test } from 'vitest';
import { decodeBmp, encodeBmp } from '../src/browser/bmp';
import { encodeTiffImage } from '../src/browser/tiff';

describe('still image codecs', () => {
  test('a 32-bit BMP round-trips RGBA', () => {
    const source = {
      width: 2,
      height: 2,
      data: new Uint8ClampedArray([
        10, 20, 30, 40,
        255, 0, 0, 255,
        0, 255, 0, 128,
        0, 0, 255, 0,
      ]),
    };
    const back = decodeBmp(encodeBmp(source));
    expect(back).not.toBeNull();
    expect(back?.width).toBe(2);
    expect(back?.height).toBe(2);
    expect(Array.from(back?.data ?? [])).toEqual(Array.from(source.data));
  });

  test('a 24-bit bottom-up BMP decodes to opaque RGB', () => {
    const bytes = new Uint8Array(58);
    const view = new DataView(bytes.buffer);
    bytes[0] = 0x42;
    bytes[1] = 0x4d;
    view.setUint32(2, 58, true);
    view.setUint32(10, 54, true);
    view.setUint32(14, 40, true);
    view.setInt32(18, 1, true);
    view.setInt32(22, 1, true);
    view.setUint16(26, 1, true);
    view.setUint16(28, 24, true);
    bytes[54] = 0;
    bytes[55] = 0;
    bytes[56] = 255;
    const image = decodeBmp(bytes);
    expect(Array.from(image?.data ?? [])).toEqual([255, 0, 0, 255]);
  });

  test('a top-down 24-bit BMP keeps the first row at the top', () => {
    const stride = 4;
    const bytes = new Uint8Array(54 + stride * 2);
    const view = new DataView(bytes.buffer);
    bytes[0] = 0x42;
    bytes[1] = 0x4d;
    view.setUint32(2, bytes.length, true);
    view.setUint32(10, 54, true);
    view.setUint32(14, 40, true);
    view.setInt32(18, 1, true);
    view.setInt32(22, -2, true);
    view.setUint16(26, 1, true);
    view.setUint16(28, 24, true);
    bytes[54] = 0;
    bytes[55] = 0;
    bytes[56] = 255;
    bytes[58] = 255;
    bytes[59] = 0;
    bytes[60] = 0;
    const image = decodeBmp(bytes);
    expect(Array.from(image?.data ?? [])).toEqual([
      255, 0, 0, 255,
      0, 0, 255, 255,
    ]);
  });

  test('an encoded TIFF decodes back to the same RGBA', async () => {
    const source = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 128]),
    };
    const bytes = await encodeTiffImage(source);
    const copy = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(copy).set(bytes);
    const utif = await import('utif');
    const api = typeof utif.decode === 'function' ? utif : utif.default;
    const pages = api.decode(copy);
    expect(pages.length).toBeGreaterThan(0);
    api.decodeImage(copy, pages[0]);
    const rgba = api.toRGBA8(pages[0]);
    expect(Array.from(rgba.slice(0, 8))).toEqual(Array.from(source.data));
  });
});
