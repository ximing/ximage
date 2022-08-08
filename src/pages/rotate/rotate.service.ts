import { Service } from '@rabjs/react';
import { measureFile } from '../../browser/measure';
import { CROP_KINDS, acceptImageFiles } from '../../domain/accept-images';
import { PROCESS_TIMEOUT_MS, errorMessage, withTimeout, yieldToUi } from '../../domain/deadline';
import { shouldRotateImage, skipReason, type OrientationFilter } from '../../tools/rotate/geometry';
import { phrase } from '../../i18n/phrase';
import {
  createItem,
  downloadOne,
  downloadQueue,
  markFailed,
  markSkipped,
  publishResult,
  revokeItem,
  type QueueItem,
  type QueueRecord,
} from '../queue-state';

const records = new Map<string, QueueRecord>();
type RotateFile = typeof import('../../browser/rotate-file').rotateFile;

export class RotateService extends Service {
  items: QueueItem[] = [];
  rejections: { name: string; reason: string }[] = [];
  selectedId = '';
  degreesText = '90';
  filter: OrientationFilter = 'all';
  bannerError = '';
  busyMessage = '';
  busyProgress = 0;

  get selected(): QueueItem | undefined {
    return this.items.find((item) => item.id === this.selectedId);
  }

  get doneCount(): number {
    return this.items.filter((item) => item.status === 'done').length;
  }

  setDegreesText(value: string) {
    this.degreesText = value;
  }

  setDegrees(value: number) {
    this.degreesText = String(value);
  }

  setFilter(filter: OrientationFilter) {
    this.filter = filter;
  }

  select(id: string) {
    this.selectedId = id;
  }

  async addFiles(files: readonly File[]) {
    const result = acceptImageFiles(files, CROP_KINDS);
    this.rejections = result.rejected;
    const taken = new Set(this.items.map((item) => item.filename));
    for (const accepted of result.accepted) {
      const item = createItem(accepted.file, accepted.kind, 'rotated', taken);
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
    downloadQueue(this.items, records, 'ximage-rotated.zip');
  }

  async run() {
    this.bannerError = '';
    const degrees = Number(this.degreesText);
    if (!Number.isFinite(degrees)) {
      this.bannerError = phrase('error.degrees');
      return;
    }
    this.busyMessage = phrase('busy.loadingRotation');
    this.busyProgress = 3;
    await yieldToUi();
    try {
      const { rotateFile } = await import('../../browser/rotate-file');
      for (const id of this.items.map((item) => item.id)) {
        await this.rotateOne(id, rotateFile, degrees);
      }
      if (!this.bannerError && this.items.length > 0 && this.items.every((item) => item.status === 'skipped')) {
        this.bannerError = this.filter === 'landscape'
          ? phrase('error.rotateNoneLandscape')
          : phrase('error.rotateNonePortrait');
      }
    } catch (error) {
      this.bannerError = errorMessage(error, phrase('error.rotateThese'));
    } finally {
      this.busyMessage = '';
      this.busyProgress = 0;
    }
  }

  async rotateOne(id: string, rotateFile: RotateFile, degrees: number) {
    const item = this.items.find((entry) => entry.id === id);
    const record = records.get(id);
    if (!item || !record) return;
    this.selectedId = id;
    item.note = '';
    try {
      if (item.sourceWidth <= 0 || item.sourceHeight <= 0) {
        const size = await measureFile(record.file, item.kind);
        if (size) {
          item.sourceWidth = Math.round(size.width);
          item.sourceHeight = Math.round(size.height);
        }
      }
    } catch {
      // The size check below reports this.
    }
    if (item.sourceWidth <= 0 || item.sourceHeight <= 0) {
      const message = phrase('error.sizeUnread');
      markFailed(item, record, message);
      this.bannerError = message;
      return;
    }
    if (!shouldRotateImage(item.sourceWidth, item.sourceHeight, this.filter)) {
      markSkipped(item, record, skipReason(item.sourceWidth, item.sourceHeight));
      return;
    }
    item.status = 'running';
    item.progress = 5;
    item.message = phrase('status.rotating');
    this.busyMessage = phrase('busy.rotatingName', { name: item.name });
    let active = true;
    try {
      const output = await withTimeout(
        rotateFile(record.file, item.kind, degrees, (progress, message) => {
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
        ? phrase('note.gifStillRotate', { name: item.name })
        : '';
      publishResult(item, record, output.bytes, output.width, output.height, note, 'Rotated');
    } catch (error) {
      active = false;
      const message = errorMessage(error, phrase('error.rotateThis'));
      markFailed(item, record, message);
      this.bannerError = message;
    }
  }
}
