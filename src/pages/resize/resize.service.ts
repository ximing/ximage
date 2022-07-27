import { Service } from '@rabjs/react';
import { measureFile } from '../../browser/measure';
import type { ResizeRequest } from '../../browser/resize-file';
import { COMPRESS_KINDS, acceptImageFiles } from '../../domain/accept-images';
import { PROCESS_TIMEOUT_MS, errorMessage, withTimeout, yieldToUi } from '../../domain/deadline';
import { exactPixelSize } from '../../tools/resize/scale';
import { phrase } from '../../i18n/phrase';
import {
  createItem,
  downloadOne,
  downloadQueue,
  markFailed,
  publishResult,
  revokeItem,
  type QueueItem,
  type QueueRecord,
} from '../queue-state';

const records = new Map<string, QueueRecord>();
type ResizeFile = typeof import('../../browser/resize-file').resizeFile;

export class ResizeService extends Service {
  items: QueueItem[] = [];
  rejections: { name: string; reason: string }[] = [];
  selectedId = '';
  mode: 'pixels' | 'percent' = 'pixels';
  widthText = '800';
  heightText = '600';
  percentText = '100';
  lockAspect = true;
  userSized = false;
  filledSize = false;
  bannerError = '';
  busyMessage = '';
  busyProgress = 0;

  get selected(): QueueItem | undefined {
    return this.items.find((item) => item.id === this.selectedId);
  }

  get doneCount(): number {
    return this.items.filter((item) => item.status === 'done').length;
  }

  setMode(mode: 'pixels' | 'percent') {
    this.mode = mode;
  }

  setWidthText(value: string) {
    this.userSized = true;
    const ratio = this.currentRatio();
    this.widthText = value;
    if (!this.lockAspect) return;
    const width = Number(value);
    if (!Number.isFinite(width) || width <= 0) return;
    this.heightText = String(Math.max(1, Math.round(width * ratio)));
  }

  setHeightText(value: string) {
    this.userSized = true;
    const ratio = this.currentRatio();
    this.heightText = value;
    if (!this.lockAspect) return;
    const height = Number(value);
    if (!Number.isFinite(height) || height <= 0) return;
    this.widthText = String(Math.max(1, Math.round(height / ratio)));
  }

  setPercentText(value: string) {
    this.percentText = value;
  }

  setLockAspect(locked: boolean) {
    this.lockAspect = locked;
    if (!locked) return;
    const width = Number(this.widthText);
    if (!Number.isFinite(width) || width <= 0) return;
    this.heightText = String(Math.max(1, Math.round(width * this.currentRatio())));
  }

  select(id: string) {
    this.selectedId = id;
  }

  async addFiles(files: readonly File[]) {
    const result = acceptImageFiles(files, COMPRESS_KINDS);
    this.rejections = result.rejected;
    const taken = new Set(this.items.map((item) => item.filename));
    for (const accepted of result.accepted) {
      const item = createItem(accepted.file, accepted.kind, 'resized', taken);
      records.set(item.id, { file: accepted.file, bytes: null });
      this.items.push(item);
      if (!this.selectedId) this.selectedId = item.id;
      await rememberSize(item, accepted.file);
      if (!this.userSized && !this.filledSize && item.sourceWidth > 0 && item.sourceHeight > 0) {
        this.widthText = String(item.sourceWidth);
        this.heightText = String(item.sourceHeight);
        this.filledSize = true;
      }
    }
  }

  discard(id: string) {
    const item = this.items.find((entry) => entry.id === id);
    if (!item) return;
    revokeItem(item);
    records.delete(id);
    this.items = this.items.filter((entry) => entry.id !== id);
    if (this.selectedId === id) this.selectedId = this.items[0]?.id ?? '';
  }

  release() {
    for (const item of this.items) {
      revokeItem(item);
      records.delete(item.id);
    }
    this.items = [];
    this.selectedId = '';
  }

  downloadSelected() {
    const item = this.selected;
    if (item) downloadOne(item, records.get(item.id));
  }

  downloadItem(id: string) {
    const item = this.items.find((entry) => entry.id === id);
    if (item) downloadOne(item, records.get(item.id));
  }

  downloadAll() {
    downloadQueue(this.items, records, 'ximage-resized.zip');
  }

  async run() {
    this.bannerError = '';
    const request = this.readRequest();
    if (!request) return;
    this.busyMessage = phrase('busy.loadingResizer');
    this.busyProgress = 3;
    await yieldToUi();
    try {
      const { resizeFile } = await import('../../browser/resize-file');
      for (const id of this.items.map((item) => item.id)) {
        await this.resizeOne(id, resizeFile, request);
      }
    } catch (error) {
      this.bannerError = errorMessage(error, phrase('error.resizeThese'));
    } finally {
      this.busyMessage = '';
      this.busyProgress = 0;
    }
  }

  async resizeOne(id: string, resizeFile: ResizeFile, request: ResizeRequest) {
    const item = this.items.find((entry) => entry.id === id);
    const record = records.get(id);
    if (!item || !record) return;
    this.selectedId = id;
    item.status = 'running';
    item.progress = 5;
    item.message = phrase('status.resizing');
    item.note = '';
    this.busyMessage = phrase('busy.resizingName', { name: item.name });
    let active = true;
    try {
      const output = await withTimeout(
        resizeFile(record.file, item.kind, request, (progress, message) => {
          if (!active) return;
          item.progress = progress;
          item.message = message;
          this.busyProgress = progress;
          this.busyMessage = message;
        }),
        PROCESS_TIMEOUT_MS,
        phrase('error.timeout'),
      );
      const note = output.still
        ? phrase('note.gifStillResize', { name: item.name })
        : '';
      publishResult(item, record, output.bytes, output.width, output.height, note, 'Resized');
    } catch (error) {
      active = false;
      const message = errorMessage(error, phrase('error.resizeThis'));
      markFailed(item, record, message);
      this.bannerError = message;
    }
  }

  private readRequest(): ResizeRequest | null {
    if (this.mode === 'percent') {
      const percent = Number(this.percentText);
      if (!Number.isFinite(percent) || percent <= 0 || percent > 4000) {
        this.bannerError = phrase('error.percentRange');
        return null;
      }
      return { mode: 'percent', percent };
    }
    try {
      const size = exactPixelSize(Number(this.widthText), Number(this.heightText));
      return { mode: 'pixels', width: size.width, height: size.height };
    } catch (error) {
      this.bannerError = errorMessage(error, phrase('error.widthHeight'));
      return null;
    }
  }

  private currentRatio(): number {
    const selected = this.selected;
    if (selected && selected.sourceWidth > 0 && selected.sourceHeight > 0) {
      return selected.sourceHeight / selected.sourceWidth;
    }
    const width = Number(this.widthText);
    const height = Number(this.heightText);
    if (width > 0 && height > 0) return height / width;
    return 1;
  }
}

async function rememberSize(item: QueueItem, file: File) {
  try {
    const size = await measureFile(file, item.kind);
    if (!size) return;
    item.sourceWidth = Math.round(size.width);
    item.sourceHeight = Math.round(size.height);
  } catch {
    item.message = phrase('status.waiting');
  }
}
