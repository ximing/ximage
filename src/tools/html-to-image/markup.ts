import { phrase } from '../../i18n/phrase';
export const AD_SELECTOR = [
  'ins.adsbygoogle',
  '[data-ad-client]',
  '[data-ad-slot]',
  'iframe[src*="doubleclick.net"]',
  'iframe[src*="googlesyndication.com"]',
  'iframe[src*="googleadservices.com"]',
  '[id*="google_ads"]',
  '[aria-label="Advertisement" i]',
  '[aria-label="advertisement" i]',
].join(', ');

export const OVERLAY_SELECTOR = [
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[aria-modal="true"]',
  '[id*="cookie" i]',
  '[class*="cookie" i]',
  '[id*="consent" i]',
  '[class*="consent" i]',
  '[id*="popup" i]',
  '[class*="popup" i]',
  '[id*="modal" i]',
  '[class*="modal" i]',
].join(', ');

const MAX_CAPTURE_HEIGHT = 16384;

export function captureHeight(scrollHeight: number): { height: number; capped: boolean } {
  const height = Math.max(1, Math.round(scrollHeight));
  if (height > MAX_CAPTURE_HEIGHT) return { height: MAX_CAPTURE_HEIGHT, capped: true };
  return { height, capped: false };
}

export function withBaseHref(html: string, pageUrl: string): string {
  if (/<base\b/i.test(html)) return html;
  const href = pageUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const tag = `<base href="${href}">`;
  if (/<head\b[^>]*>/i.test(html)) return html.replace(/<head\b[^>]*>/i, (match) => `${match}${tag}`);
  if (/<html\b[^>]*>/i.test(html)) return html.replace(/<html\b[^>]*>/i, (match) => `${match}<head>${tag}</head>`);
  return `<!DOCTYPE html><html><head>${tag}</head><body>${html}</body></html>`;
}

export function bytesFromDataUrl(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) throw new Error(phrase('error.notDataUrl'));
  const header = dataUrl.slice(0, comma);
  const body = dataUrl.slice(comma + 1);
  if (/;base64/i.test(header)) {
    const binary = atob(body);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }
  return new TextEncoder().encode(decodeURIComponent(body));
}

export function svgBytes(value: string): Uint8Array {
  const trimmed = value.trim();
  if (trimmed.startsWith('<')) return new TextEncoder().encode(trimmed);
  return bytesFromDataUrl(value);
}
