import { unzipSync } from 'fflate';
import { Container, register, resolve } from '@rabjs/react';
import { describe, expect, test } from 'vitest';
import { acceptFiles } from '../src/domain/accept';
import { compositeSubject } from '../src/domain/composite';
import { archiveDownloads, collectDownloads, cutoutFilename } from '../src/domain/download';
import { ThemeService } from '../src/services/theme.service';

function imageFile(name: string, type: string): File {
  return new File([new Uint8Array([1, 2, 3, 4])], name, { type });
}

describe('shipped acceptance, theme, composite, and batch', () => {
  test('accepts JPG and PNG and rejects another type', () => {
    const jpg = imageFile('portrait.jpg', 'image/jpeg');
    const png = imageFile('object.png', 'image/png');
    const gif = imageFile('notes.gif', 'image/gif');
    const result = acceptFiles([jpg, png, gif]);

    expect(result.accepted.map((file) => file.name)).toEqual(['portrait.jpg', 'object.png']);
    expect(result.rejected).toEqual([
      { name: 'notes.gif', reason: 'Only JPG and PNG images can be added.' },
    ]);
  });

  test('theme flips between light and dark and a second reader sees it', () => {
    const container = new Container({ name: 'theme-test' });
    register(ThemeService, undefined, container);
    const writer = resolve(ThemeService, container);
    expect(writer.theme).toBe('light');

    writer.toggle();
    const reader = resolve(ThemeService, container);
    expect(reader).toBe(writer);
    expect(reader.theme).toBe('dark');

    reader.toggle();
    expect(writer.theme).toBe('light');
  });

  test('composite keeps dimensions, subject pixels, transparency, and a solid background', () => {
    const source = {
      width: 2,
      height: 1,
      data: new Uint8ClampedArray([
        10, 20, 30, 255,
        1, 2, 3, 255,
      ]),
    };
    const mask = new Uint8Array([255, 0]);

    const transparent = compositeSubject(source, mask, null);
    expect(transparent.width).toBe(source.width);
    expect(transparent.height).toBe(source.height);
    expect(Array.from(transparent.data)).toEqual([
      10, 20, 30, 255,
      1, 2, 3, 0,
    ]);

    const solid = compositeSubject(source, mask, { r: 255, g: 0, b: 0 });
    expect(solid.width).toBe(2);
    expect(solid.height).toBe(1);
    expect(Array.from(solid.data.slice(0, 4))).toEqual([10, 20, 30, 255]);
    expect(Array.from(solid.data.slice(4))).toEqual([255, 0, 0, 255]);

    const partial = compositeSubject(
      { width: 1, height: 1, data: new Uint8ClampedArray([0, 0, 0, 255]) },
      new Uint8Array([128]),
      { r: 255, g: 0, b: 0 },
    );
    expect(partial.data[0]).toBe(Math.round(255 * (1 - 128 / 255)));
    expect(partial.data[3]).toBe(255);
  });

  test('two accepted items yield two downloadable results', () => {
    const result = acceptFiles([
      imageFile('one.jpg', 'image/jpeg'),
      imageFile('two.png', 'image/png'),
      imageFile('skip.gif', 'image/gif'),
    ]);
    expect(result.accepted).toHaveLength(2);

    const taken = new Set<string>();
    const rows = [
      ...result.accepted.map((file) => ({
        status: 'done',
        filename: cutoutFilename(file.name, taken),
        bytes: new Uint8Array([8, 9, file.name.length]),
      })),
      ...result.rejected.map((file) => ({
        status: 'error',
        filename: file.name,
        bytes: null,
      })),
    ];
    const downloads = collectDownloads(rows);
    expect(downloads.map((file) => file.filename)).toEqual(['one-cutout.png', 'two-cutout.png']);
    expect(downloads).toHaveLength(2);

    const archive = archiveDownloads(downloads);
    const entries = unzipSync(archive);
    expect(Object.keys(entries).sort()).toEqual(['one-cutout.png', 'two-cutout.png']);
    expect(Array.from(entries['one-cutout.png'])).toEqual(Array.from(downloads[0].bytes));
  });
});
