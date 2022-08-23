import { Service } from '@rabjs/react';
import { measureFile } from '../../browser/measure';
import { CROP_KINDS, acceptImageFiles } from '../../domain/accept-images';
import { PROCESS_TIMEOUT_MS, errorMessage, withTimeout, yieldToUi } from '../../domain/deadline';
import {
  clampFontSize,
  clampOpacity,
  watermarkFont,
  watermarkPosition,
  type WatermarkPosition,
} from '../../tools/watermark/anchor';
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
let markFile: File | null = null;

export class WatermarkService extends Service {
  items: QueueItem[] = [];
  rejections: { name: string; reason: string }[] = [];
  selectedId = '';
  showText = false;
  text = '';
  font = 'Arial';
  fontSizeText = '48';
  opacity = 100;
  position: WatermarkPosition = 'center';
  markName = '';
  markUrl = '';
  bannerError = '';
  busyMessage = '';
  busyProgress = 0;

  get selected(): QueueItem | undefined {
    return this.items.find((item) => item.id === this.selectedId);
  }

  get doneCount(): number {
    return this.items.filter((item) => item.status === 'done').length;
  }

  get hasMark(): boolean {
    return this.text.trim().length > 0 || this.markName.length > 0;
  }

  select(id: string) {
    this.selectedId = id;
  }

  addText() {
    this.showText = true;
  }

  setText(value: string) {
    this.text = value;
  }

  setFont(value: string) {
    this.font = watermarkFont(value);
  }

  setFontSizeText(value: string) {
    this.fontSizeText = value;
  }

  setOpacity(value: number) {
    this.opacity = clampOpacity(value);
  }

  setPosition(position: WatermarkPosition) {
    this.position = watermarkPosition(position);
  }

  setMark(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const result = acceptImageFiles([file], CROP_KINDS);
    if (result.rejected.length > 0) {
      this.rejections = result.rejected;
      return;
    }
    this.clearMark();
    markFile = file;
    this.markName = file.name || 'Watermark';
    this.markUrl = URL.createObjectURL(file);
  }

  clearMark() {
    if (this.markUrl.startsWith('blob:')) URL.revokeObjectURL(this.markUrl);
    markFile = null;
    this.markName = '';
    this.markUrl = '';
  }

  async addFiles(files: readonly File[]) {
    const result = acceptImageFiles(files, CROP_KINDS);
    this.rejections = result.rejected;
    const taken = new Set(this.items.map((item) => item.filename));
    for (const accepted of result.accepted) {
      const item = createItem(accepted.file, accepted.kind, 'watermark', taken);
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
    this.clearMark();
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
    downloadQueue(this.items, records, 'ximage-watermarked.zip');
  }

  async run() {
    this.bannerError = '';
    const text = this.text.trim();
    if (this.items.length === 0 || (!text && !markFile)) return;
    let fontSize = 48;
    if (text) {
      try {
        fontSize = clampFontSize(Number(this.fontSizeText));
      } catch (error) {
        this.bannerError = errorMessage(error, phrase('error.fontSize'));
        return;
      }
    }
    const opacity = clampOpacity(this.opacity);
    this.busyMessage = phrase('busy.loadingWatermark');
    this.busyProgress = 3;
    await yieldToUi();
    try {
      const [{ watermarkFile }, { fileToImageData }] = await Promise.all([
        import('../../browser/decorate'),
        import('../../browser/raster'),
      ]);
      const mark = markFile ? await fileToImageData(markFile) : null;
      const options = {
        text,
        font: watermarkFont(this.font),
        fontSize,
        opacity,
        position: watermarkPosition(this.position),
        mark,
      };
      for (const id of this.items.map((item) => item.id)) {
        await this.stampOne(id, watermarkFile, options);
      }
    } catch (error) {
      this.bannerError = errorMessage(error, phrase('error.watermarkThese'));
    } finally {
      this.busyMessage = '';
      this.busyProgress = 0;
    }
  }

  async stampOne(
    id: string,
    watermarkFile: typeof import('../../browser/decorate').watermarkFile,
    options: import('../../browser/decorate').StampOptions,
  ) {
    const item = this.items.find((entry) => entry.id === id);
    const record = records.get(id);
    if (!item || !record) return;
    this.selectedId = id;
    item.status = 'running';
    item.progress = 8;
    item.message = phrase('status.watermarking');
    item.note = '';
    this.busyMessage = phrase('busy.watermarkingName', { name: item.name });
    try {
      const output = await withTimeout(
        watermarkFile(record.file, item.kind, options),
        PROCESS_TIMEOUT_MS,
        phrase('error.timeout'),
      );
      if (item.sourceWidth < 1) {
        item.sourceWidth = output.width;
        item.sourceHeight = output.height;
      }
      publishResult(
        item,
        record,
        output.bytes,
        output.width,
        output.height,
        output.note,
        phrase('status.watermarked'),
      );
    } catch (error) {
      const message = errorMessage(error, phrase('error.watermarkThis'));
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
