import { yieldToUi } from '../domain/deadline';
import { phrase } from '../i18n/phrase';
import {
  AD_SELECTOR,
  OVERLAY_SELECTOR,
  captureHeight,
  svgBytes,
  withBaseHref,
} from '../tools/html-to-image/markup';

export type HtmlImageFormat = 'jpg' | 'svg';

export type HtmlImageOutput = {
  bytes: Uint8Array;
  width: number;
  height: number;
  note: string;
};

type Progress = (progress: number, message: string) => void;

export async function readWebsite(url: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(phrase('error.fullUrl'));
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(phrase('error.httpOnly'));
  }
  let response: Response;
  try {
    response = await fetch(parsed.href, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      redirect: 'follow',
    });
  } catch (error) {
    const detail = error instanceof Error && error.message.trim() ? error.message.trim() : 'Failed to fetch';
    throw new Error(phrase('error.cors', { detail }));
  }
  if (!response.ok) throw new Error(phrase('error.httpStatus', { status: response.status }));
  const type = (response.headers.get('content-type') || '').toLowerCase();
  if (type.startsWith('image/') || type.startsWith('video/') || type.startsWith('audio/')) {
    throw new Error(phrase('error.notHtml'));
  }
  const html = await response.text();
  if (!html.trim()) throw new Error(phrase('error.emptyPage'));
  return withBaseHref(html, response.url || parsed.href);
}

export async function renderHtml(options: {
  html: string;
  width: number;
  format: HtmlImageFormat;
  blockAds: boolean;
  removeOverlays: boolean;
  onProgress?: Progress;
}): Promise<HtmlImageOutput> {
  const html = options.html.trim();
  if (!html) throw new Error(phrase('error.pasteOrUrl'));
  if (!Number.isFinite(options.width) || options.width < 1) throw new Error(phrase('error.screenWidth'));
  const width = Math.round(options.width);
  options.onProgress?.(40, phrase('progress.renderingHtml'));
  await yieldToUi();
  const frame = document.createElement('iframe');
  frame.title = 'HTML render';
  frame.setAttribute('sandbox', 'allow-same-origin');
  frame.referrerPolicy = 'no-referrer';
  frame.style.position = 'fixed';
  frame.style.left = '16px';
  frame.style.top = '76px';
  frame.style.width = `${width}px`;
  frame.style.height = '480px';
  frame.style.border = '0';
  frame.style.background = '#ffffff';
  frame.style.zIndex = '20';
  document.body.appendChild(frame);
  try {
    const doc = await openFrame(frame);
    doc.open();
    doc.write(html);
    doc.close();
    options.onProgress?.(55, phrase('progress.waitingLayout'));
    await waitForAssets(doc);
    if (options.blockAds) removeMatches(doc, AD_SELECTOR);
    if (options.removeOverlays) {
      removeMatches(doc, OVERLAY_SELECTOR);
      removeLargeFixedOverlays(doc, width);
    }
    await yieldToUi();
    const measured = captureHeight(contentHeight(doc));
    frame.style.height = `${measured.height}px`;
    await yieldToUi();
    const height = captureHeight(Math.max(measured.height, contentHeight(doc))).height;
    frame.style.height = `${height}px`;
    if (height < 1) throw new Error(phrase('error.noVisible'));
    options.onProgress?.(82, options.format === 'jpg' ? phrase('progress.exportingJpg') : phrase('progress.exportingSvg'));
    const bytes = await exportDocument(doc.documentElement, width, height, options.format);
    if (bytes.byteLength === 0) throw new Error(phrase('error.emptyExport'));
    const note = measured.capped ? phrase('note.pageCapped', { height: measured.height }) : '';
    return { bytes, width, height, note };
  } finally {
    frame.remove();
  }
}

async function openFrame(frame: HTMLIFrameElement): Promise<Document> {
  if (!frame.contentDocument) {
    await new Promise<void>((resolve) => {
      frame.addEventListener('load', () => resolve(), { once: true });
    });
  }
  const doc = frame.contentDocument;
  if (!doc) throw new Error(phrase('error.blockedFrame'));
  return doc;
}

async function waitForAssets(doc: Document): Promise<void> {
  const images = [...doc.images];
  await Promise.all(images.map((image) => limit(image.decode().catch(() => undefined), 8000)));
  if (doc.fonts) await limit(doc.fonts.ready.then(() => undefined), 8000);
  await yieldToUi();
}

function limit(work: Promise<unknown>, milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, milliseconds);
    work.then(
      () => {
        clearTimeout(timer);
        resolve();
      },
      () => {
        clearTimeout(timer);
        resolve();
      },
    );
  });
}

function contentHeight(doc: Document): number {
  const root = doc.documentElement;
  const body = doc.body;
  return Math.max(
    root?.scrollHeight ?? 0,
    root?.offsetHeight ?? 0,
    body?.scrollHeight ?? 0,
    body?.offsetHeight ?? 0,
  );
}

function removeMatches(doc: Document, selector: string) {
  let nodes: NodeListOf<Element>;
  try {
    nodes = doc.querySelectorAll(selector);
  } catch {
    return;
  }
  for (const node of nodes) {
    if (node === doc.body || node === doc.documentElement || node === doc.head) continue;
    node.remove();
  }
}

function removeLargeFixedOverlays(doc: Document, viewportWidth: number) {
  const view = doc.defaultView;
  const body = doc.body;
  if (!view || !body) return;
  const viewportHeight = Math.max(view.innerHeight || 0, 1);
  const nodes = [...body.querySelectorAll('*')];
  for (const node of nodes) {
    if (!(node instanceof view.HTMLElement)) continue;
    if (node === body) continue;
    const style = view.getComputedStyle(node);
    if (style.position !== 'fixed') continue;
    const rect = node.getBoundingClientRect();
    if (rect.width >= viewportWidth * 0.85 && rect.height >= viewportHeight * 0.45) node.remove();
  }
}

async function exportDocument(
  node: HTMLElement,
  width: number,
  height: number,
  format: HtmlImageFormat,
): Promise<Uint8Array> {
  const { domToBlob, domToSvg } = await import('modern-screenshot');
  if (format === 'svg') {
    const svg = await domToSvg(node, {
      width,
      height,
      scale: 1,
      backgroundColor: '#ffffff',
      timeout: 12000,
    });
    const bytes = svgBytes(svg);
    if (!new TextDecoder().decode(bytes.slice(0, 240)).toLowerCase().includes('<svg')) {
      throw new Error(phrase('error.svgExport'));
    }
    return bytes;
  }
  const blob = await domToBlob(node, {
    type: 'image/jpeg',
    quality: 0.92,
    width,
    height,
    scale: 1,
    backgroundColor: '#ffffff',
    timeout: 12000,
    fetch: {
      requestInit: { mode: 'cors', credentials: 'omit' },
      placeholderImage: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    },
  });
  if (!blob || blob.size === 0) throw new Error(phrase('error.jpgExport'));
  return new Uint8Array(await blob.arrayBuffer());
}
