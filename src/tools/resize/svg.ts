import { phrase } from '../../i18n/phrase';
export type SvgSize = {
  width: number;
  height: number;
};

/** Resize stays vector: width and height attributes change, and a missing viewBox is added from the old size. */
export function readSvgSize(markup: string): SvgSize | null {
  const tag = openingTag(markup);
  if (!tag) return null;
  const width = readLength(attribute(tag.attrs, 'width'));
  const height = readLength(attribute(tag.attrs, 'height'));
  if (width && height) return { width, height };
  const viewBox = attribute(tag.attrs, 'viewBox');
  if (!viewBox) return null;
  const parts = viewBox.trim().split(/[\s,]+/u).map(Number);
  if (parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0) {
    return { width: parts[2], height: parts[3] };
  }
  return null;
}

export function resizeSvgMarkup(markup: string, width: number, height: number): string {
  const widthPx = Math.round(width);
  const heightPx = Math.round(height);
  if (widthPx < 1 || heightPx < 1) throw new Error(phrase('error.minPixels'));
  const tag = openingTag(markup);
  if (!tag) throw new Error(phrase('error.notSvg'));
  const original = readSvgSize(markup);
  let attrs = tag.attrs;
  const hasViewBox = /\bviewBox\s*=/iu.test(attrs);
  attrs = upsertAttribute(attrs, 'width', String(widthPx));
  attrs = upsertAttribute(attrs, 'height', String(heightPx));
  if (!hasViewBox && original) {
    attrs = upsertAttribute(attrs, 'viewBox', `0 0 ${trimNumber(original.width)} ${trimNumber(original.height)}`);
  }
  const slash = tag.selfClosing ? ' /' : '';
  return `${markup.slice(0, tag.start)}<svg${attrs}${slash}>${markup.slice(tag.end)}`;
}

function openingTag(markup: string): { attrs: string; selfClosing: boolean; start: number; end: number } | null {
  const match = /<svg\b([^>]*?)(\/?)\s*>/iu.exec(markup);
  if (!match) return null;
  return {
    attrs: match[1] ?? '',
    selfClosing: Boolean(match[2]),
    start: match.index,
    end: match.index + match[0].length,
  };
}

function attribute(attrs: string, name: string): string | null {
  const match = new RegExp(`\\b${name}\\s*=\\s*(['"])(.*?)\\1`, 'iu').exec(attrs);
  return match ? match[2] : null;
}

function upsertAttribute(attrs: string, name: string, value: string): string {
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(['"]).*?\\1`, 'iu');
  if (pattern.test(attrs)) return attrs.replace(pattern, `${name}="${value}"`);
  return `${attrs} ${name}="${value}"`;
}

function readLength(value: string | null): number | null {
  if (!value) return null;
  const match = /^(\d+(?:\.\d+)?)(px)?$/iu.exec(value.trim());
  if (!match) return null;
  const parsed = Number(match[1]);
  return parsed > 0 ? parsed : null;
}

function trimNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}
