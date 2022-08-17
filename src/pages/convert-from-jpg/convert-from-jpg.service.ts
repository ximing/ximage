import { Service } from '@rabjs/react';
import { measureFile } from '../../browser/measure';
import { PROCESS_TIMEOUT_MS, errorMessage, withTimeout, yieldToUi } from '../../domain/deadline';
import { toolFilename } from '../../domain/names';
import { measureKind, type ConvertSource } from '../../tools/convert-to-jpg/accept';
import { outputExtension, type ConvertOutput } from '../../tools/convert/outputs';
import { readSvgSize } from '../../tools/resize/svg';
import {
  acceptConvertFromJpg,
  animatedGifEnabled,
  gifFrameDelay,
  type GifMotion,
} from '../../tools/convert-from-jpg/plan';
import { phrase } from '../../i18n/phrase';
import {
  createItem,
  downloadOne,
  downloadQueue,
  markFailed,
  markSkipped,
  publishResult,
  replaceResultPreview,
  revokeItem,
  type QueueItem,
  type QueueRecord,
} from '../queue-state';

const records = new Map<string, QueueRecord>();
const sources = new Map<string, ConvertSource>();

export class ConvertFromJpgService extends Service {
  items: QueueItem[] = [];
  rejections: { name: string; reason: string }[] = [];
  selectedId = '';
  format: ConvertOutput = 'png';
  gifMotion: GifMotion = 'static';
  secondsText = '0.5';
  loop = true;
  bannerError = '';
  busyMessage = '';
  busyProgress = 0;

  get selected(): QueueItem | undefined {
    return this.items.find((item) => item.id === this.selectedId);
  }

  get doneCount(): number {
    return this.items.filter((item) => item.status === 'done').length;
  }

  get animatedReady(): boolean {
    return animatedGifEnabled(this.items.length);
  }

  setFormat(format: ConvertOutput) {
    this.format = format;
    renameForOutput(this.items, format, false);
  }

  setGifMotion(motion: GifMotion) {
    if (motion === 'animated' && !this.animatedReady) return;
    this.gifMotion = motion;
  }

  setSecondsText(value: string) {
    this.secondsText = value;
  }

  setLoop(loop: boolean) {
    this.loop = loop;
  }

  select(id: string) {
    this.selectedId = id;
  }

  async addFiles(files: readonly File[]) {
    const result = acceptConvertFromJpg(files);
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
    if (!this.animatedReady && this.gifMotion === 'animated') this.gifMotion = 'static';
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
    const animated = this.format === 'gif' && this.gifMotion === 'animated';
    if (animated && !this.animatedReady) {
      this.bannerError = phrase('error.gifRequired');
      return;
    }
    let delay = 500;
    if (animated) {
      try {
        delay = gifFrameDelay(Number(this.secondsText));
      } catch (error) {
        this.bannerError = errorMessage(error, phrase('error.seconds'));
        return;
      }
    }
    const format = this.format;
    this.busyMessage = phrase('busy.loadingConverter');
    this.busyProgress = 3;
    await yieldToUi();
    try {
      if (animated) await this.convertAnimated(delay);
      else await this.convertEach(format);
    } catch (error) {
      this.bannerError = errorMessage(error, phrase('error.convertThese'));
    } finally {
      this.busyMessage = '';
      this.busyProgress = 0;
    }
  }

  async convertEach(format: ConvertOutput) {
    const { convertRaster } = await import('../../browser/convert-raster');
    renameForOutput(this.items, format, true);
    for (const id of this.items.map((item) => item.id)) {
      await this.convertOne(id, format, convertRaster);
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
      item.sourceWidth = item.sourceWidth || output.width;
      item.sourceHeight = item.sourceHeight || output.height;
      publishResult(item, record, output.bytes, output.width, output.height, output.note, phrase('status.converted'));
      if (output.preview) replaceResultPreview(item, output.preview);
    } catch (error) {
      const message = errorMessage(error, phrase('error.convertThis'));
      markFailed(item, record, message);
      this.bannerError = message;
    }
  }

  async convertAnimated(delay: number) {
    const [{ decodeConvertSource }, { imagesToAnimatedGif }] = await Promise.all([
      import('../../browser/convert-to-jpeg'),
      import('../../browser/convert-from-jpeg'),
    ]);
    const first = this.items[0];
    if (!first) return;
    this.selectedId = first.id;
    for (const item of this.items) {
      item.status = 'running';
      item.progress = 10;
      item.message = phrase('status.addingGif');
      item.note = '';
    }
    this.busyMessage = phrase('busy.buildingGif');
    this.busyProgress = 30;
    try {
      const output = await withTimeout(
        (async () => {
          const frames: ImageData[] = [];
          for (const item of this.items) {
            const record = records.get(item.id);
            const source = sources.get(item.id);
            if (!record || !source) throw new Error(phrase('error.noImages'));
            frames.push((await decodeConvertSource(record.file, source)).image);
          }
          return imagesToAnimatedGif(frames, delay, this.loop);
        })(),
        PROCESS_TIMEOUT_MS,
        phrase('error.timeoutMany'),
      );
      const taken = new Set<string>();
      first.kind = 'gif';
      first.filename = toolFilename(first.name, 'animated', 'gif', taken);
      first.sourceWidth = first.sourceWidth || output.width;
      first.sourceHeight = first.sourceHeight || output.height;
      const record = records.get(first.id);
      if (!record) return;
      publishResult(first, record, output.bytes, output.width, output.height, output.note, phrase('status.converted'));
      for (const item of this.items.slice(1)) {
        const entry = records.get(item.id);
        if (entry) markSkipped(item, entry, phrase('status.includedGif'));
      }
    } catch (error) {
      const message = errorMessage(error, phrase('error.gifBuild'));
      this.bannerError = message;
      for (const item of this.items) {
        const entry = records.get(item.id);
        if (entry) markFailed(item, entry, message);
      }
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
