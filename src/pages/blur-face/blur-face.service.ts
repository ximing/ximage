import { Service } from '@rabjs/react';
import { measureFile } from '../../browser/measure';
import { PROCESS_TIMEOUT_MS, errorMessage, withTimeout, yieldToUi } from '../../domain/deadline';
import { acceptBlurFaceFiles } from '../../tools/blur-face/accept';
import { detectionConfidence, type DetectionLevel } from '../../tools/blur-face/level';
import { clampBlurRect, pointerToImagePixel, type BlurRect } from '../../tools/blur-face/rect';
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
type BlurFaceFile = typeof import('../../browser/blur-face').blurFaceFile;

export class BlurFaceService extends Service {
  items: QueueItem[] = [];
  rejections: { name: string; reason: string }[] = [];
  selectedId = '';
  level: DetectionLevel = 'recommended';
  addingArea = false;
  areas: Record<string, BlurRect[]> = {};
  draft: BlurRect | null = null;
  bannerError = '';
  busyMessage = '';
  busyProgress = 0;
  private dragOrigin: { x: number; y: number } | null = null;
  private dragId = '';

  get selected(): QueueItem | undefined {
    return this.items.find((item) => item.id === this.selectedId);
  }

  get doneCount(): number {
    return this.items.filter((item) => item.status === 'done').length;
  }

  get confidenceLabel(): string {
    const confidence = detectionConfidence(this.level);
    if (this.level === 'low') return phrase('page.blur.confidenceLow', { confidence });
    if (this.level === 'high') return phrase('page.blur.confidenceHigh', { confidence });
    return phrase('page.blur.confidenceRecommended', { confidence });
  }

  setLevel(level: DetectionLevel) {
    this.level = level;
  }

  toggleAdding() {
    this.addingArea = !this.addingArea;
    if (!this.addingArea) this.clearDrag();
  }

  select(id: string) {
    this.selectedId = id;
    this.clearDrag();
  }

  async addFiles(files: readonly File[]) {
    const result = acceptBlurFaceFiles(files);
    this.rejections = result.rejected;
    const taken = new Set(this.items.map((item) => item.filename));
    for (const accepted of result.accepted) {
      const item = createItem(accepted.file, accepted.kind, 'blurred', taken);
      records.set(item.id, { file: accepted.file, bytes: null });
      this.items.push(item);
      if (!this.selectedId) this.selectedId = item.id;
      await rememberSize(item, accepted.file);
    }
  }

  noteSize(id: string, width: number, height: number) {
    const item = this.items.find((entry) => entry.id === id);
    if (!item || width < 1 || height < 1) return;
    item.sourceWidth = Math.round(width);
    item.sourceHeight = Math.round(height);
  }

  beginArea(stage: HTMLDivElement, clientX: number, clientY: number, pointerId: number) {
    if (!this.addingArea) return;
    const selected = this.selected;
    if (!selected || selected.sourceWidth < 1 || selected.sourceHeight < 1) return;
    const bounds = stage.getBoundingClientRect();
    const point = pointerToImagePixel(
      bounds.width,
      bounds.height,
      selected.sourceWidth,
      selected.sourceHeight,
      clientX - bounds.left,
      clientY - bounds.top,
    );
    this.dragId = selected.id;
    this.dragOrigin = point;
    this.draft = { x: point.x, y: point.y, width: 0, height: 0 };
    stage.setPointerCapture(pointerId);
  }

  moveArea(stage: HTMLDivElement, clientX: number, clientY: number) {
    if (!this.dragOrigin || !this.dragId) return;
    const item = this.items.find((entry) => entry.id === this.dragId);
    if (!item || item.sourceWidth < 1 || item.sourceHeight < 1) return;
    const bounds = stage.getBoundingClientRect();
    const point = pointerToImagePixel(
      bounds.width,
      bounds.height,
      item.sourceWidth,
      item.sourceHeight,
      clientX - bounds.left,
      clientY - bounds.top,
    );
    const origin = this.dragOrigin;
    this.draft = {
      x: Math.min(origin.x, point.x),
      y: Math.min(origin.y, point.y),
      width: Math.abs(point.x - origin.x),
      height: Math.abs(point.y - origin.y),
    };
  }

  endArea() {
    const id = this.dragId;
    const draft = this.draft;
    const item = this.items.find((entry) => entry.id === id);
    this.clearDrag();
    if (!item || !draft) return;
    const rect = clampBlurRect(draft, item.sourceWidth, item.sourceHeight);
    if (rect.width < 2 || rect.height < 2) return;
    const existing = this.areas[id] ?? [];
    this.areas = { ...this.areas, [id]: [...existing, rect] };
  }

  removeArea(id: string, index: number) {
    const existing = this.areas[id] ?? [];
    this.areas = { ...this.areas, [id]: existing.filter((_, areaIndex) => areaIndex !== index) };
  }

  discard(id: string) {
    const item = this.items.find((entry) => entry.id === id);
    if (!item) return;
    revokeItem(item);
    records.delete(id);
    const next = { ...this.areas };
    delete next[id];
    this.areas = next;
    this.items = this.items.filter((entry) => entry.id !== id);
    if (this.selectedId === id) this.selectedId = this.items[0]?.id ?? '';
    if (this.dragId === id) this.clearDrag();
  }

  release() {
    for (const item of this.items) {
      revokeItem(item);
      records.delete(item.id);
    }
    this.items = [];
    this.selectedId = '';
    this.areas = {};
    this.clearDrag();
    void import('../../browser/blur-face').then((module) => module.releaseFaceDetector());
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
    downloadQueue(this.items, records, 'ximage-blurred.zip');
  }

  async run() {
    this.bannerError = '';
    if (this.items.length === 0) return;
    const level = this.level;
    this.busyMessage = phrase('busy.loadingFace');
    this.busyProgress = 4;
    await yieldToUi();
    try {
      const { prepareFaceDetector, blurFaceFile } = await import('../../browser/blur-face');
      await withTimeout(
        prepareFaceDetector((progress, message) => {
          this.busyProgress = progress;
          this.busyMessage = message;
        }),
        PROCESS_TIMEOUT_MS,
        phrase('error.faceTimeout'),
      );
      for (const id of this.items.map((item) => item.id)) {
        await this.blurOne(id, blurFaceFile, level);
      }
    } catch (error) {
      this.bannerError = errorMessage(error, phrase('error.blurThese'));
    } finally {
      this.busyMessage = '';
      this.busyProgress = 0;
    }
  }

  async blurOne(id: string, blurFaceFile: BlurFaceFile, level: DetectionLevel) {
    const item = this.items.find((entry) => entry.id === id);
    const record = records.get(id);
    if (!item || !record) return;
    this.selectedId = id;
    item.status = 'running';
    item.progress = 5;
    item.message = phrase('status.blurring');
    item.note = '';
    this.busyMessage = phrase('busy.blurringName', { name: item.name });
    const manual = (this.areas[id] ?? []).map((rect) => ({ ...rect }));
    let active = true;
    try {
      const output = await withTimeout(
        blurFaceFile(record.file, item.kind, level, manual, (progress, message) => {
          if (!active) return;
          item.progress = progress;
          item.message = message;
          this.busyProgress = progress;
          this.busyMessage = message;
        }),
        PROCESS_TIMEOUT_MS,
        phrase('error.timeout'),
      );
      item.sourceWidth = output.width;
      item.sourceHeight = output.height;
      publishResult(item, record, output.bytes, output.width, output.height, output.note, 'Blurred');
    } catch (error) {
      active = false;
      const message = errorMessage(error, phrase('error.blurThis'));
      markFailed(item, record, message);
      this.bannerError = message;
    }
  }

  private clearDrag() {
    this.dragOrigin = null;
    this.dragId = '';
    this.draft = null;
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
