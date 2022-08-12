import { Service } from '@rabjs/react';
import { measureFile } from '../../browser/measure';
import { PROCESS_TIMEOUT_MS, errorMessage, withTimeout, yieldToUi } from '../../domain/deadline';
import { toolFilename } from '../../domain/names';
import { acceptConvertToJpg, measureKind, type ConvertSource } from '../../tools/convert-to-jpg/accept';
import { outputExtension, type ConvertOutput } from '../../tools/convert/outputs';
import { readSvgSize } from '../../tools/resize/svg';
import { phrase } from '../../i18n/phrase';
import {
  createItem,
  downloadOne,
  downloadQueue,
  markFailed,
  publishResult,
  replaceResultPreview,
  revokeItem,
  type QueueItem,
  type QueueRecord,
} from '../queue-state';

const records = new Map<string, QueueRecord>();
const sources = new Map<string, ConvertSource>();

export class ConvertToJpgService extends Service {
  items: QueueItem[] = [];
  rejections: { name: string; reason: string }[] = [];
  selectedId = '';
  format: ConvertOutput = 'jpeg';
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

  setFormat(format: ConvertOutput) {
    this.format = format;
    renameForOutput(this.items, format, false);
  }

  async addFiles(files: readonly File[]) {
    const result = acceptConvertToJpg(files);
    this.rejections = result.rejected;
    const taken = new Set(this.items.map((item) => item.filename));
    const extension = outputExtension(this.format);
    for (const accepted of result.accepted) {
      const item = createItem(accepted.file, this.format, extension, taken);
      records.set(item.id, { file: accepted.file, bytes: null });
      sources.set(item.id, accepted.source);
      this.items.push(item);
      if (!this.selectedId) this.selectedId = item.id;
      await rememberSource(item, accepted.file, accepted.source);
    }
  }

  discard(id: string) {
    const item = this.items.find((entry) => entry.id === id);
    if (!item) return;
    revokeItem(item);
    records.delete(id);
    sources.delete(id);
    this.items = this.items.filter((entry) => entry.id !== id);
    if (this.selectedId === id) this.selectedId = this.items[0]?.id ?? '';
  }

  release() {
    for (const item of this.items) {
      revokeItem(item);
      records.delete(item.id);
      sources.delete(item.id);
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
    downloadQueue(this.items, records, 'ximage-converted.zip');
  }

  async run() {
    this.bannerError = '';
    if (this.items.length === 0) return;
    const format = this.format;
    this.busyMessage = phrase('busy.loadingConverter');
    this.busyProgress = 3;
    await yieldToUi();
    try {
      const { convertRaster } = await import('../../browser/convert-raster');
      renameForOutput(this.items, format, true);
      for (const id of this.items.map((item) => item.id)) {
        await this.convertOne(id, format, convertRaster);
      }
    } catch (error) {
      this.bannerError = errorMessage(error, phrase('error.convertThese'));
    } finally {
      this.busyMessage = '';
      this.busyProgress = 0;
    }
  }

  async convertOne(
    id: string,
    format: ConvertOutput,
    convertRaster: typeof import('../../browser/convert-raster').convertRaster,
  ) {
    const item = this.items.find((entry) => entry.id === id);
    const record = records.get(id);
    const source = sources.get(id);
    if (!item || !record || !source) return;
    this.selectedId = id;
    item.status = 'running';
    item.progress = 8;
    item.message = phrase('status.converting');
    item.note = '';
    this.busyMessage = phrase('busy.convertingName', { name: item.name });
    try {
      const output = await withTimeout(
        convertRaster(record.file, source, format),
        PROCESS_TIMEOUT_MS,
        phrase('error.timeout'),
      );
      item.kind = format;
      item.sourceWidth = output.width;
      item.sourceHeight = output.height;
      publishResult(item, record, output.bytes, output.width, output.height, output.note, phrase('status.converted'));
      if (output.preview) replaceResultPreview(item, output.preview);
    } catch (error) {
      const message = errorMessage(error, phrase('error.convertThis'));
      markFailed(item, record, message);
      this.bannerError = message;
    }
  }
}

function renameForOutput(items: QueueItem[], format: ConvertOutput, includeDone: boolean) {
  const extension = outputExtension(format);
  const taken = new Set<string>();
  for (const item of items) {
    if (!includeDone && item.status === 'done') {
      taken.add(item.filename);
      continue;
    }
    item.kind = format;
    item.filename = toolFilename(item.name, extension, extension, taken);
  }
}

async function rememberSource(item: QueueItem, file: File, source: ConvertSource) {
  try {
    const kind = measureKind(source);
    if (kind === 'svg') {
      const size = readSvgSize(await file.text());
      if (!size) return;
      item.sourceWidth = Math.round(size.width);
      item.sourceHeight = Math.round(size.height);
      return;
    }
    if (!kind) return;
    const size = await measureFile(file, kind);
    if (!size) return;
    item.sourceWidth = Math.round(size.width);
    item.sourceHeight = Math.round(size.height);
  } catch {
    item.message = phrase('status.waiting');
  }
}
