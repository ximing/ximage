import { Service } from '@rabjs/react';
import { measureFile } from '../../browser/measure';
import { COMPRESS_KINDS, acceptImageFiles } from '../../domain/accept-images';
import { PROCESS_TIMEOUT_MS, errorMessage, withTimeout, yieldToUi } from '../../domain/deadline';
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
type CompressFile = typeof import('../../browser/compress-file').compressFile;

export class CompressService extends Service {
  items: QueueItem[] = [];
  rejections: { name: string; reason: string }[] = [];
  selectedId = '';
  quality = 75;
  bannerError = '';
  busyMessage = '';
  busyProgress = 0;

  get selected(): QueueItem | undefined {
    return this.items.find((item) => item.id === this.selectedId);
  }

  get doneCount(): number {
    return this.items.filter((item) => item.status === 'done').length;
  }

  setQuality(value: number) {
    if (!Number.isFinite(value)) return;
    this.quality = Math.min(100, Math.max(1, Math.round(value)));
  }

  select(id: string) {
    this.selectedId = id;
  }

  async addFiles(files: readonly File[]) {
    const result = acceptImageFiles(files, COMPRESS_KINDS);
    this.rejections = result.rejected;
    const taken = new Set(this.items.map((item) => item.filename));
    for (const accepted of result.accepted) {
      const item = createItem(accepted.file, accepted.kind, 'compressed', taken);
      records.set(item.id, { file: accepted.file, bytes: null });
      this.items.push(item);
      if (!this.selectedId) this.selectedId = item.id;
      await rememberSize(item, accepted.file);
    }
  }

  discard(id: string) {
    removeItem(this, id);
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
    downloadQueue(this.items, records, 'ximage-compressed.zip');
  }

  async run() {
    this.bannerError = '';
    this.busyMessage = phrase('busy.loadingCompressor');
    this.busyProgress = 3;
    await yieldToUi();
    try {
      const { compressFile } = await import('../../browser/compress-file');
      for (const id of this.items.map((item) => item.id)) {
        await this.compressOne(id, compressFile);
      }
    } catch (error) {
      this.bannerError = errorMessage(error, phrase('error.compressThese'));
    } finally {
      this.busyMessage = '';
      this.busyProgress = 0;
    }
  }

  async compressOne(id: string, compressFile: CompressFile) {
    const item = this.items.find((entry) => entry.id === id);
    const record = records.get(id);
    if (!item || !record) return;
    this.selectedId = id;
    item.status = 'running';
    item.progress = 5;
    item.message = phrase('status.compressing');
    item.note = '';
    this.busyMessage = phrase('busy.compressingName', { name: item.name });
    let active = true;
    try {
      const output = await withTimeout(
        compressFile(record.file, item.kind, this.quality, (progress, message) => {
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
        ? phrase('note.gifStillCompress', { name: item.name })
        : '';
      publishResult(
        item,
        record,
        output.bytes,
        output.width || item.sourceWidth,
        output.height || item.sourceHeight,
        note,
        phrase('status.compressed'),
      );
    } catch (error) {
      active = false;
      const message = errorMessage(error, phrase('error.compressThis'));
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

function removeItem(service: { items: QueueItem[]; selectedId: string }, id: string) {
  const item = service.items.find((entry) => entry.id === id);
  if (!item) return;
  revokeItem(item);
  records.delete(id);
  service.items = service.items.filter((entry) => entry.id !== id);
  if (service.selectedId === id) service.selectedId = service.items[0]?.id ?? '';
}
