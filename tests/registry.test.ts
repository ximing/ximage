import { describe, expect, test } from 'vitest';
import { tools } from '../src/tools/registry';

const ids = [
  'remove-background',
  'compress',
  'resize',
  'crop',
  'convert-to-jpg',
  'convert-from-jpg',
  'photo-editor',
  'upscale',
  'watermark',
  'meme',
  'rotate',
  'html-to-image',
  'blur-face',
];

describe('tool registry', () => {
  test('contains exactly these 13 ids', () => {
    expect(tools.map((tool) => tool.id).sort()).toEqual([...ids].sort());
    expect(tools.map((tool) => tool.path).sort()).toEqual(ids.map((id) => `/${id}`).sort());
    expect(new Set(tools.map((tool) => tool.title)).size).toBe(ids.length);
    expect(tools.every((tool) => tool.description.length > 0)).toBe(true);
  });
});
