import { Service } from '@rabjs/react';
import { saveBlob } from '../../domain/download';
import { PROCESS_TIMEOUT_MS, errorMessage, withTimeout, yieldToUi } from '../../domain/deadline';
import {
  screenWidthFor,
  yourScreenWidth,
  type ScreenSizeId,
} from '../../tools/html-to-image/screen';
import type { HtmlImageFormat } from '../../browser/html-to-image';
import { phrase } from '../../i18n/phrase';

export class HtmlToImageService extends Service {
  url = '';
  html = '';
  screenId: ScreenSizeId = 'your-screen';
  format: HtmlImageFormat = 'jpg';
  blockAds = false;
  removeOverlays = false;
  busyMessage = '';
  busyProgress = 0;
  bannerError = '';
  note = '';
  resultUrl = '';
  resultWidth = 0;
  resultHeight = 0;
  private resultBytes: Uint8Array | null = null;

  get screenPixels(): number {
    if (typeof window === 'undefined') return 0;
    return yourScreenWidth(window.screen?.width ?? 0, window.innerWidth || 0);
  }

  get frameWidth(): number {
    if (this.screenId === 'your-screen') return this.screenPixels || yourScreenWidth(0, 0);
    return screenWidthFor(this.screenId);
  }

  get canConvert(): boolean {
    return this.url.trim().length > 0 || this.html.trim().length > 0;
  }

  setUrl(value: string) {
    this.url = value;
  }

  setHtml(value: string) {
    this.html = value;
  }

  setScreen(id: ScreenSizeId) {
    this.screenId = id;
  }

  setFormat(format: HtmlImageFormat) {
    this.format = format;
  }

  setBlockAds(value: boolean) {
    this.blockAds = value;
  }

  setRemoveOverlays(value: boolean) {
    this.removeOverlays = value;
  }

  release() {
    this.clearResult();
  }

  download() {
    if (!this.resultBytes) return;
    const extension = this.format === 'jpg' ? 'jpg' : 'svg';
    const type = this.format === 'jpg' ? 'image/jpeg' : 'image/svg+xml';
    saveBlob(new Blob([this.resultBytes as BlobPart], { type }), `html-page.${extension}`);
  }

  async convert() {
    this.bannerError = '';
    this.note = '';
    this.clearResult();
    const pasted = this.html.trim();
    const url = this.url.trim();
    if (!pasted && !url) {
      this.bannerError = phrase('error.pasteOrUrl');
      return;
    }
    const width = this.frameWidth;
    const format = this.format;
    const blockAds = this.blockAds;
    const removeOverlays = this.removeOverlays;
    this.busyMessage = pasted ? phrase('busy.renderingHtml') : phrase('busy.fetchingPage');
    this.busyProgress = 8;
    await yieldToUi();
    try {
      const { readWebsite, renderHtml } = await import('../../browser/html-to-image');
      let html = pasted;
      if (!pasted) {
        html = await withTimeout(readWebsite(url), 30_000, phrase('error.siteTimeout'));
        this.busyMessage = phrase('busy.renderingHtml');
        this.busyProgress = 30;
        await yieldToUi();
      }
      const output = await withTimeout(
        renderHtml({
          html,
          width,
          format,
          blockAds,
          removeOverlays,
          onProgress: (progress, message) => {
            this.busyProgress = progress;
            this.busyMessage = message;
          },
        }),
        PROCESS_TIMEOUT_MS,
        phrase('error.htmlTimeout'),
      );
      const type = format === 'jpg' ? 'image/jpeg' : 'image/svg+xml';
      this.resultBytes = output.bytes;
      this.resultWidth = output.width;
      this.resultHeight = output.height;
      this.note = output.note;
      this.resultUrl = URL.createObjectURL(new Blob([output.bytes as BlobPart], { type }));
    } catch (error) {
      this.clearResult();
      this.bannerError = errorMessage(error, phrase('error.htmlConvert'));
    } finally {
      this.busyMessage = '';
      this.busyProgress = 0;
    }
  }

  private clearResult() {
    if (this.resultUrl.startsWith('blob:')) URL.revokeObjectURL(this.resultUrl);
    this.resultUrl = '';
    this.resultBytes = null;
    this.resultWidth = 0;
    this.resultHeight = 0;
  }
}
