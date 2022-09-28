import { describe, expect, test } from 'vitest';
import { acceptImageFiles } from '../src/domain/accept-images';
import { phrase } from '../src/i18n/phrase';
import { formatBytes } from '../src/domain/bytes';
import { clampCropRect, percentCropToPixels } from '../src/tools/crop/rect';
import { scaleDimensions } from '../src/tools/resize/scale';
import { resizeSvgMarkup } from '../src/tools/resize/svg';
import { acceptConvertFromJpg, animatedGifEnabled, ANIMATED_GIF_REQUIRED } from '../src/tools/convert-from-jpg/plan';
import { acceptConvertToJpg } from '../src/tools/convert-to-jpg/accept';
import { captionBandHeight, textOutsideHeight } from '../src/tools/meme/layout';
import { rotatedDimensions, shouldRotateImage } from '../src/tools/rotate/geometry';
import { watermarkAnchor } from '../src/tools/watermark/anchor';
import { acceptUpscaleFiles } from '../src/tools/upscale/accept';
import { upscaleDimensions } from '../src/tools/upscale/scale';
import { acceptBlurFaceFiles } from '../src/tools/blur-face/accept';
import { clampBlurRect } from '../src/tools/blur-face/rect';
import { SCREEN_WIDTH_BY_ID, screenWidthFor } from '../src/tools/html-to-image/screen';

function file(name: string, type: string): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type });
}

describe('shipped tool math and acceptance', () => {
  test('a 200x100 image at 50 percent becomes 100x50', () => {
    expect(scaleDimensions(200, 100, 50)).toEqual({ width: 100, height: 50 });
  });

  test('a crop rectangle outside the image is clamped', () => {
    expect(clampCropRect({ x: -20, y: 10, width: 50, height: 200 }, 100, 80)).toEqual({
      x: 0,
      y: 10,
      width: 30,
      height: 70,
    });
    expect(clampCropRect({ x: 500, y: -40, width: 20, height: 30 }, 200, 100)).toEqual({
      x: 200,
      y: 0,
      width: 0,
      height: 0,
    });
  });

  test('percent crop pixels match the source', () => {
    expect(percentCropToPixels({ x: 0, y: 0, width: 50, height: 50 }, 200, 100)).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    });
  });

  test('90-degree rotation of 200x100 reports 100x200 and 180 reports 200x100', () => {
    expect(rotatedDimensions(200, 100, 90)).toEqual({ width: 100, height: 200 });
    expect(rotatedDimensions(200, 100, 180)).toEqual({ width: 200, height: 100 });
    expect(rotatedDimensions(200, 100, 270)).toEqual({ width: 100, height: 200 });
  });

  test('landscape-only skips a portrait image', () => {
    expect(shouldRotateImage(100, 200, 'landscape')).toBe(false);
    expect(shouldRotateImage(200, 100, 'landscape')).toBe(true);
  });

  test('a non-image type is rejected by the shipped accept function', () => {
    const result = acceptImageFiles(
      [file('notes.txt', 'text/plain'), file('photo.jpg', 'image/jpeg')],
      ['jpeg', 'png', 'svg', 'gif'],
    );
    expect(result.accepted.map((item) => item.name)).toEqual(['photo.jpg']);
    expect(result.rejected).toEqual([
      { name: 'notes.txt', reason: phrase('reason.only', { types: 'JPG, PNG, SVG, GIF' }) },
    ]);
  });

  test('svg resize stays vector and sets the requested pixel size', () => {
    const source = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100"/></svg>';
    const out = resizeSvgMarkup(source, 100, 50);
    const tag = out.match(/<svg\b[^>]*>/iu)?.[0] ?? '';
    expect(tag).toContain('width="100"');
    expect(tag).toContain('height="50"');
    expect(tag).toContain('viewBox="0 0 200 100"');
    expect(tag).not.toContain('width="200"');
    expect(out).toContain('<rect width="200" height="100"/>');
  });

  test('byte sizes use the shipped formatter', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  test('convert accepts JPG, PNG, BMP, AVIF, and camera RAW', () => {
    const files = [
      file('photo.jpg', 'image/jpeg'),
      file('scan.jpeg', ''),
      file('plain.jfif', ''),
      file('object.png', 'image/png'),
      file('shot.nef', ''),
      file('icon.bmp', 'image/bmp'),
      file('still.avif', ''),
      file('notes.txt', 'text/plain'),
      file('cursor.ico', 'image/x-icon'),
    ];
    const result = acceptConvertToJpg(files);
    expect(result.accepted.map((item) => item.name)).toEqual([
      'photo.jpg',
      'scan.jpeg',
      'plain.jfif',
      'object.png',
      'shot.nef',
      'icon.bmp',
      'still.avif',
    ]);
    expect(result.accepted.map((item) => item.source)).toEqual([
      'jpeg',
      'jpeg',
      'jpeg',
      'png',
      'raw',
      'bmp',
      'avif',
    ]);
    expect(result.rejected).toEqual([
      { name: 'notes.txt', reason: phrase('reason.unsupportedSource') },
      { name: 'cursor.ico', reason: phrase('reason.unsupportedSource') },
    ]);
    expect(acceptConvertFromJpg(files).accepted.map((item) => item.source)).toEqual(result.accepted.map((item) => item.source));
  });

  test('animated GIF is disabled below 2 images and enabled at 2', () => {
    expect(animatedGifEnabled(0)).toBe(false);
    expect(animatedGifEnabled(1)).toBe(false);
    expect(animatedGifEnabled(2)).toBe(true);
    expect(ANIMATED_GIF_REQUIRED).toBe(phrase('error.gifRequired'));
  });

  test('watermark anchor coordinates for a known box', () => {
    expect(watermarkAnchor(200, 100, 40, 20, 'bottom-right', 8)).toEqual({ x: 152, y: 72 });
    expect(watermarkAnchor(200, 100, 40, 20, 'center')).toEqual({ x: 80, y: 40 });
    expect(watermarkAnchor(200, 100, 40, 20, 'top-left', 8)).toEqual({ x: 8, y: 8 });
  });

  test('160x160 at 2x is 320x320 and at 4x is 640x640', () => {
    expect(upscaleDimensions(160, 160, 2)).toEqual({ width: 320, height: 320 });
    expect(upscaleDimensions(160, 160, 4)).toEqual({ width: 640, height: 640 });
  });

  test('a blur rectangle outside the image is clamped', () => {
    expect(clampBlurRect({ x: -20, y: 10, width: 50, height: 200 }, 100, 80)).toEqual({
      x: 0,
      y: 10,
      width: 30,
      height: 70,
    });
    expect(clampBlurRect({ x: 500, y: -40, width: 20, height: 30 }, 200, 100)).toEqual({
      x: 200,
      y: 0,
      width: 0,
      height: 0,
    });
  });

  test('screen-size ids map to 1920, 1440, 768, and 320', () => {
    expect(screenWidthFor('desktop-hd')).toBe(1920);
    expect(screenWidthFor('desktop')).toBe(1440);
    expect(screenWidthFor('tablet')).toBe(768);
    expect(screenWidthFor('mobile')).toBe(320);
    expect(SCREEN_WIDTH_BY_ID).toEqual({
      'desktop-hd': 1920,
      desktop: 1440,
      tablet: 768,
      mobile: 320,
    });
  });

  test('a GIF is rejected on upscale and on blur-face', () => {
    const gif = file('anim.gif', 'image/gif');
    const upscale = acceptUpscaleFiles([gif, file('photo.jpg', 'image/jpeg'), file('scan.png', 'image/png')]);
    const blur = acceptBlurFaceFiles([gif, file('photo.jpg', 'image/jpeg'), file('scan.png', 'image/png')]);
    expect(upscale.accepted.map((item) => item.name)).toEqual(['photo.jpg', 'scan.png']);
    expect(upscale.rejected).toEqual([{ name: 'anim.gif', reason: phrase('reason.only', { types: 'JPG, PNG' }) }]);
    expect(blur.accepted.map((item) => item.name)).toEqual(['photo.jpg', 'scan.png']);
    expect(blur.rejected).toEqual([{ name: 'anim.gif', reason: phrase('reason.only', { types: 'JPG, PNG' }) }]);
  });

  test('text outside height is the source height plus the two caption bands', () => {
    const topBand = captionBandHeight(1, 32);
    const bottomBand = captionBandHeight(2, 32);
    expect(topBand).toBeGreaterThan(0);
    expect(bottomBand).toBeGreaterThan(topBand);
    expect(textOutsideHeight(160, topBand, bottomBand)).toBe(160 + topBand + bottomBand);
    expect(textOutsideHeight(200, 40, 56)).toBe(296);
  });
});
