import { Service } from '@rabjs/react';
import { measureFile } from '../../browser/measure';
import { CROP_KINDS, acceptImageFiles } from '../../domain/accept-images';
import { PROCESS_TIMEOUT_MS, errorMessage, withTimeout, yieldToUi } from '../../domain/deadline';
import type { MemePlacement } from '../../tools/meme/layout';
import { phrase } from '../../i18n/phrase';
import {
  createItem,
  downloadOne,
  markFailed,
  publishResult,
  revokeItem,
  type QueueItem,
  type QueueRecord,
} from '../queue-state';

const records = new Map<string, QueueRecord>();

export class MemeService extends Service {
  items: QueueItem[] = [];
  rejections: { name: string; reason: string }[] = [];
  selectedId = '';
  topText = '';
  bottomText = '';
  placement: MemePlacement = 'inside';
  bannerError = '';
  busyMessage = '';
  busyProgress = 0;

  get selected(): QueueItem | undefined {
    return this.items.find((item) => item.id === this.selectedId);
  }

  get doneCount(): number {
    return this.items.filter((item) => item.status === 'done').length;
  }

  select(id: string) {
    this.selectedId = id;
  }

  setTopText(value: string) {
    this.topText = value;
  }

  setBottomText(value: string) {
    this.bottomText = value;
  }

  setPlacement(placement: MemePlacement) {
    this.placement = placement;
  }

  addRejections(extra: { name: string; reason: string }[]) {
    if (extra.length === 0) return;
    this.rejections = [...this.rejections, ...extra];
  }

  async addFiles(files: readonly File[]) {
    const result = acceptImageFiles(files, CROP_KINDS);
    const extra = result.accepted.slice(1).map((item) => ({
      name: item.name,
      reason: phrase('reason.memeOne'),
    }));
    this.rejections = [...result.rejected, ...extra];
    const accepted = result.accepted[0];
    if (!accepted) return;
    this.clearQueue();
    const item = createItem(accepted.file, accepted.kind, 'meme', new Set());
    records.set(item.id, { file: accepted.file, bytes: null });
    this.items = [item];
    this.selectedId = item.id;
    await rememberSize(item, accepted.file);
  }

  discard(id: string) {
    const item = this.items.find((entry) => entry.id === id);
    if (!item) return;
    revokeItem(item);
    records.delete(id);
    this.items = [];
    this.selectedId = '';
  }

  release() {
    this.clearQueue();
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
    this.downloadSelected();
  }

  async run() {
    this.bannerError = '';
    const item = this.items[0];
    const record = item ? records.get(item.id) : undefined;
    if (!item || !record) return;
    this.busyMessage = phrase('busy.generatingMeme');
    this.busyProgress = 8;
    item.status = 'running';
    item.progress = 8;
    item.message = phrase('status.generating');
    item.note = '';
    await yieldToUi();
    try {
      const { memeFile } = await import('../../browser/decorate');
      const output = await withTimeout(
        memeFile(record.file, item.kind, {
          top: this.topText,
          bottom: this.bottomText,
          placement: this.placement,
        }),
        PROCESS_TIMEOUT_MS,
        phrase('error.timeout'),
      );
      publishResult(item, record, output.bytes, output.width, output.height, output.note, phrase('status.generated'));
      downloadOne(item, record);
    } catch (error) {
      const message = errorMessage(error, phrase('error.memeFail'));
      markFailed(item, record, message);
      this.bannerError = message;
    } finally {
      this.busyMessage = '';
      this.busyProgress = 0;
    }
  }

  private clearQueue() {
    for (const item of this.items) {
      revokeItem(item);
      records.delete(item.id);
    }
    this.items = [];
    this.selectedId = '';
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
