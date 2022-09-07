import { Service } from '@rabjs/react';
import { measureFile } from '../../browser/measure';
import { PROCESS_TIMEOUT_MS, errorMessage, withTimeout, yieldToUi } from '../../domain/deadline';
import { acceptUpscaleFiles } from '../../tools/upscale/accept';
import { upscaleDimensions, type UpscaleFactor } from '../../tools/upscale/scale';
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
type UpscaleFile = typeof import('../../browser/upscale-file').upscaleFile;

export class UpscaleService extends Service {
  items: QueueItem[] = [];
  rejections: { name: string; reason: string }[] = [];
  selectedId = '';
  factor: UpscaleFactor = 2;
  bannerError = '';
  busyMessage = '';
  busyProgress = 0;

  get selected(): QueueItem | undefined {
    return this.items.find((item) => item.id === this.selectedId);
  }

  get doneCount(): number {
    return this.items.filter((item) => item.status === 'done').length;
  }

  get previewLine(): string {
    const selected = this.selected;
    if (!selected || selected.sourceWidth < 1 || selected.sourceHeight < 1) {
      return phrase('caption.previewPending');
    }
    const target = upscaleDimensions(selected.sourceWidth, selected.sourceHeight, this.factor);
    return phrase('caption.previewSize', {
      width: selected.sourceWidth,
      height: selected.sourceHeight,
      targetWidth: target.width,
      targetHeight: target.height,
    });
  }

  setFactor(factor: UpscaleFactor) {
    this.factor = factor;
  }

  select(id: string) {
    this.selectedId = id;
  }

  async addFiles(files: readonly File[]) {
    const result = acceptUpscaleFiles(files);
    this.rejections = result.rejected;
    const taken = new Set(this.items.map((item) => item.filename));
    for (const accepted of result.accepted) {
      const item = createItem(accepted.file, accepted.kind, 'upscaled', taken);
      records.set(item.id, { file: accepted.file, bytes: null });
      this.items.push(item);
      if (!this.selectedId) this.selectedId = item.id;
      await rememberSize(item, accepted.file);
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
    void import('../../browser/upscale-file').then((module) => module.releaseUpscaler());
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
    downloadQueue(this.items, records, 'ximage-upscaled.zip');
  }

  async run() {
    this.bannerError = '';
    if (this.items.length === 0) return;
    const factor = this.factor;
    this.busyMessage = phrase('busy.loadingUpscaler');
    this.busyProgress = 4;
    await yieldToUi();
    try {
      const { prepareUpscaler, upscaleFile } = await import('../../browser/upscale-file');
      await withTimeout(
        prepareUpscaler((progress, message) => {
          this.busyProgress = progress;
          this.busyMessage = message;
        }),
        PROCESS_TIMEOUT_MS,
        phrase('error.upscaleTimeout'),
      );
      for (const id of this.items.map((item) => item.id)) {
        await this.upscaleOne(id, upscaleFile, factor);
      }
    } catch (error) {
      this.bannerError = errorMessage(error, phrase('error.upscaleThese'));
    } finally {
      this.busyMessage = '';
      this.busyProgress = 0;
    }
  }

  async upscaleOne(id: string, upscaleFile: UpscaleFile, factor: UpscaleFactor) {
    const item = this.items.find((entry) => entry.id === id);
    const record = records.get(id);
    if (!item || !record) return;
    this.selectedId = id;
    item.status = 'running';
    item.progress = 5;
    item.message = phrase('status.upscaling');
    item.note = '';
    this.busyMessage = phrase('busy.upscalingName', { name: item.name });
    let active = true;
    try {
      const output = await withTimeout(
        upscaleFile(record.file, item.kind, factor, (progress, message) => {
          if (!active) return;
          item.progress = progress;
          item.message = message;
          this.busyProgress = progress;
          this.busyMessage = message;
        }),
        PROCESS_TIMEOUT_MS,
        phrase('error.timeout'),
      );
      item.sourceWidth = output.sourceWidth;
      item.sourceHeight = output.sourceHeight;
      publishResult(item, record, output.bytes, output.width, output.height, '', 'Upscaled');
    } catch (error) {
      active = false;
      const message = errorMessage(error, phrase('error.upscaleThis'));
      markFailed(item, record, message);
      this.bannerError = message;
    }
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

