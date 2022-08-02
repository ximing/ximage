import { Service } from '@rabjs/react';
import { measureFile } from '../../browser/measure';
import { CROP_KINDS, acceptImageFiles } from '../../domain/accept-images';
import { PROCESS_TIMEOUT_MS, errorMessage, withTimeout, yieldToUi } from '../../domain/deadline';
import { DEFAULT_CROP_PERCENT, type CropRect } from '../../tools/crop/rect';
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

export type CropItem = QueueItem & {
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
};

const records = new Map<string, QueueRecord>();
type CropFile = typeof import('../../browser/crop-file').cropFile;

export class CropService extends Service {
  items: CropItem[] = [];
  rejections: { name: string; reason: string }[] = [];
  selectedId = '';
  bannerError = '';
  busyMessage = '';
  busyProgress = 0;

  get selected(): CropItem | undefined {
    return this.items.find((item) => item.id === this.selectedId);
  }

  get doneCount(): number {
    return this.items.filter((item) => item.status === 'done').length;
  }

  select(id: string) {
    this.selectedId = id;
  }

  setCrop(crop: CropRect) {
    const item = this.selected;
    if (!item) return;
    item.cropX = crop.x;
    item.cropY = crop.y;
    item.cropWidth = crop.width;
    item.cropHeight = crop.height;
  }

  noteSize(id: string, width: number, height: number) {
    const item = this.items.find((entry) => entry.id === id);
    if (!item || item.sourceWidth > 0 || width <= 0 || height <= 0) return;
    item.sourceWidth = width;
    item.sourceHeight = height;
  }

  async addFiles(files: readonly File[]) {
    const result = acceptImageFiles(files, CROP_KINDS);
    this.rejections = result.rejected;
    const taken = new Set(this.items.map((item) => item.filename));
    for (const accepted of result.accepted) {
      const base = createItem(accepted.file, accepted.kind, 'cropped', taken);
      const item: CropItem = {
        ...base,
        cropX: DEFAULT_CROP_PERCENT.x,
        cropY: DEFAULT_CROP_PERCENT.y,
        cropWidth: DEFAULT_CROP_PERCENT.width,
        cropHeight: DEFAULT_CROP_PERCENT.height,
      };
      records.set(item.id, { file: accepted.file, bytes: null });
      this.items.push(item);
      if (!this.selectedId) this.selectedId = item.id;
      try {
        const size = await measureFile(accepted.file, accepted.kind);
        if (size) {
          item.sourceWidth = Math.round(size.width);
          item.sourceHeight = Math.round(size.height);
        }
      } catch {
        item.message = phrase('status.waiting');
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
    downloadQueue(this.items, records, 'ximage-cropped.zip');
  }

  async run() {
    this.bannerError = '';
    this.busyMessage = phrase('busy.loadingCrop');
    this.busyProgress = 3;
    await yieldToUi();
    try {
      const { cropFile } = await import('../../browser/crop-file');
      for (const id of this.items.map((item) => item.id)) {
        await this.cropOne(id, cropFile);
      }
    } catch (error) {
      this.bannerError = errorMessage(error, phrase('error.cropThese'));
    } finally {
      this.busyMessage = '';
      this.busyProgress = 0;
    }
  }

  async cropOne(id: string, cropFile: CropFile) {
    const item = this.items.find((entry) => entry.id === id);
    const record = records.get(id);
    if (!item || !record) return;
    this.selectedId = id;
    item.status = 'running';
    item.progress = 5;
    item.message = phrase('status.cropping');
    item.note = '';
    this.busyMessage = phrase('busy.croppingName', { name: item.name });
    let active = true;
    try {
      const output = await withTimeout(
        cropFile(
          record.file,
          item.kind,
          { x: item.cropX, y: item.cropY, width: item.cropWidth, height: item.cropHeight },
          (progress, message) => {
            if (!active) return;
            item.progress = progress;
            item.message = message;
            this.busyProgress = progress;
            this.busyMessage = message;
          },
        ),
        PROCESS_TIMEOUT_MS,
        phrase('error.timeout'),
      );
      const note = output.still
        ? phrase('note.gifStillCrop', { name: item.name })
        : '';
      publishResult(item, record, output.bytes, output.width, output.height, note, 'Cropped');
    } catch (error) {
      active = false;
      const message = errorMessage(error, phrase('error.cropThis'));
      markFailed(item, record, message);
      this.bannerError = message;
    }
  }
}
