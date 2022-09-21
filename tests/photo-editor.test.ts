import { describe, expect, test } from 'vitest';
import { phrase } from '../src/i18n/phrase';
import { acceptEditorFiles } from '../src/tools/photo-editor/accept';
import { clampEditorCrop, lockedResize, rotateLeftSize } from '../src/tools/photo-editor/geometry';

function file(name: string, type: string): File {
  return new File([new Uint8Array([1, 2, 3])], name, { type });
}

describe('photo editor', () => {
  test('resize 200x100 with aspect lock and width 50 yields 50x25', () => {
    expect(lockedResize(200, 100, 50, 100, true, 'width')).toEqual({ width: 50, height: 25 });
    expect(lockedResize(200, 100, 50, 80, true, 'height')).toEqual({ width: 160, height: 80 });
    expect(lockedResize(200, 100, 50, 80, false, 'width')).toEqual({ width: 50, height: 80 });
  });

  test('a crop larger than the image clamps', () => {
    expect(clampEditorCrop({ x: 0, y: 0, width: 500, height: 400 }, 200, 100)).toEqual({
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
    expect(clampEditorCrop({ x: 150, y: 40, width: 100, height: 90 }, 200, 100)).toEqual({
      x: 150,
      y: 40,
      width: 50,
      height: 60,
    });
  });

  test('rotate-left of 200x100 reports 100x200', () => {
    expect(rotateLeftSize(200, 100)).toEqual({ width: 100, height: 200 });
  });

  test('a non-jpg/png is rejected', () => {
    const result = acceptEditorFiles([
      file('notes.txt', 'text/plain'),
      file('anim.gif', 'image/gif'),
      file('scan.png', 'image/x-png'),
    ]);
    expect(result.accepted?.name).toBe('scan.png');
    expect(result.rejected).toEqual([
      { name: 'notes.txt', reason: phrase('reason.editJpgPng') },
      { name: 'anim.gif', reason: phrase('reason.editJpgPng') },
    ]);
    const batch = acceptEditorFiles([
      file('a.jpg', 'image/jpeg'),
      file('b.png', 'image/png'),
    ]);
    expect(batch.accepted?.name).toBe('a.jpg');
    expect(batch.rejected).toEqual([
      { name: 'b.png', reason: phrase('reason.editOne') },
    ]);
  });
});
