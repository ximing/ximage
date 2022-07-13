import { Service } from '@rabjs/react';
import { decodeImage, encodePng, maskFromCutout } from '../../browser/pixels';
import { acceptFiles } from '../../domain/accept';
import { compositeSubject, parseCssColor, type PixelImage } from '../../domain/composite';
import { archiveDownloads, collectDownloads, cutoutFilename, saveBlob, type Downloadable } from '../../domain/download';
import { phrase } from '../../i18n/phrase';


export type QueueStatus = 'queued' | 'running' | 'done' | 'error';

export type QueueItem = {
  id: string;
  name: string;
  filename: string;
  status: QueueStatus;
  progress: number;
  message: string;
  error: string;
  width: number;
  height: number;
  sourceUrl: string;
  resultUrl: string;
};

type RecordedImage = {
  file: File;
  source: PixelImage | null;
  mask: Uint8Array | null;
  png: Uint8Array | null;
};

const records = new Map<string, RecordedImage>();

export class StudioService extends Service {
  items: QueueItem[] = [];
  rejections: { name: string; reason: string }[] = [];
  selectedId = '';
  /** `null` exports a transparent PNG. A `#rrggbb` value composites that solid color. */
  background: string | null = null;
  bannerError = '';

  get selected(): QueueItem | undefined {
    return this.items.find((item) => item.id === this.selectedId);
  }

  get doneCount(): number {
    return this.items.filter((item) => item.status === 'done').length;
  }

  addFiles(files: readonly File[]) {
    const result = acceptFiles(files);
    this.rejections = result.rejected;
    const taken = new Set(this.items.map((item) => item.filename));
    for (const accepted of result.accepted) {
      const id = crypto.randomUUID();
      const filename = cutoutFilename(accepted.name, taken);
      records.set(id, { file: accepted.file, source: null, mask: null, png: null });
      this.items.push({
        id,
        name: accepted.name,
        filename,
        status: 'queued',
        progress: 0,
        message: phrase('status.waiting'),
        error: '',
        width: 0,
        height: 0,
        sourceUrl: URL.createObjectURL(accepted.file),
        resultUrl: '',
      });
    }
    if (!this.selectedId && this.items.length > 0) {
      this.selectedId = this.items[0].id;
    }
  }

  select(id: string) {
    this.selectedId = id;
  }

  discard(id: string) {
    const item = this.items.find((entry) => entry.id === id);
    if (!item) return;
    URL.revokeObjectURL(item.sourceUrl);
    if (item.resultUrl.startsWith('blob:')) URL.revokeObjectURL(item.resultUrl);
    records.delete(id);
    this.items = this.items.filter((entry) => entry.id !== id);
    if (this.selectedId === id) this.selectedId = this.items[0]?.id ?? '';
  }

  async removeAll() {
    this.bannerError = '';
    for (const item of this.items.slice()) {
      if (item.status === 'done') continue;
      await this.removeOne(item.id);
    }
  }

  async removeOne(id: string) {
    const item = this.items.find((entry) => entry.id === id);
    const record = records.get(id);
    if (!item || !record) return;
    item.status = 'running';
    item.error = '';
    item.progress = 0;
    item.message = phrase('busy.loadingModel', { progress: 0 });
    try {
      const { removeBackground } = await import('../../domain/remove');
      const cutout = await removeBackground(record.file, (update) => {
        item.progress = update.progress;
        item.message = update.message;
      });
      record.source = await decodeImage(record.file);
      record.mask = await maskFromCutout(cutout.png, cutout.width, cutout.height);
      item.width = cutout.width;
      item.height = cutout.height;
      await this.publish(id);
      item.status = 'done';
      item.progress = 100;
      item.message = phrase('status.backgroundRemoved');
    } catch (error) {
      const message = error instanceof Error ? error.message : phrase('error.modelStart');
      item.status = 'error';
      item.progress = 0;
      item.error = message;
      item.message = message;
      this.bannerError = message;
    }
  }

  async setBackground(color: string | null) {
    this.background = color;
    for (const item of this.items.slice()) {
      if (item.status !== 'done') continue;
      await this.publish(item.id);
    }
  }

  downloadables(): Downloadable[] {
    return collectDownloads(
      this.items.map((item) => ({
        status: item.status,
        filename: item.filename,
        bytes: records.get(item.id)?.png ?? null,
      })),
    );
  }

  downloadOne(id: string) {
    const item = this.items.find((entry) => entry.id === id);
    const bytes = records.get(id)?.png;
    if (!item || !bytes) return;
    saveBlob(new Blob([bytes as BlobPart]), item.filename);
  }

  downloadAll() {
    const files = this.downloadables();
    if (files.length === 0) return;
    if (files.length === 1) {
      saveBlob(new Blob([files[0].bytes as BlobPart]), files[0].filename);
      return;
    }
    const zipped = archiveDownloads(files);
    saveBlob(new Blob([zipped as BlobPart]), 'ximage-cutouts.zip');
  }

  async publish(id: string) {
    const item = this.items.find((entry) => entry.id === id);
    const record = records.get(id);
    if (!item || !record?.source || !record.mask) return;
    const background = this.background === null ? null : parseCssColor(this.background);
    const image = compositeSubject(record.source, record.mask, background);
    const blob = await encodePng(image);
    if (item.resultUrl.startsWith('blob:')) URL.revokeObjectURL(item.resultUrl);
    item.resultUrl = URL.createObjectURL(blob);
    record.png = new Uint8Array(await blob.arrayBuffer());
  }
}
