import type { ImageKind } from '../domain/accept-images';
import { phrase } from '../i18n/phrase';
import { extensionFor, mimeFor } from '../domain/accept-images';
import { archiveDownloads, collectDownloads, saveBlob } from '../domain/download';
import { toolFilename } from '../domain/names';

export type QueueStatus = 'queued' | 'running' | 'done' | 'error' | 'skipped';

export type QueueItem = {
  id: string;
  name: string;
  filename: string;
  kind: ImageKind;
  status: QueueStatus;
  progress: number;
  message: string;
  sourceWidth: number;
  sourceHeight: number;
  resultWidth: number;
  resultHeight: number;
  originalBytes: number;
  resultBytes: number;
  sourceUrl: string;
  resultUrl: string;
  note: string;
};

export type QueueRecord = {
  file: File;
  bytes: Uint8Array | null;
};

export function createItem(file: File, kind: ImageKind, label: string, taken: Set<string>): QueueItem {
  const name = file.name || 'Untitled';
  return {
    id: crypto.randomUUID(),
    name,
    filename: toolFilename(name, label, extensionFor(kind), taken),
    kind,
    status: 'queued',
    progress: 0,
    message: phrase('status.waiting'),
    sourceWidth: 0,
    sourceHeight: 0,
    resultWidth: 0,
    resultHeight: 0,
    originalBytes: file.size,
    resultBytes: 0,
    sourceUrl: URL.createObjectURL(file),
    resultUrl: '',
    note: '',
  };
}

export function replaceResultPreview(item: QueueItem, preview: Blob) {
  if (item.resultUrl.startsWith('blob:')) URL.revokeObjectURL(item.resultUrl);
  item.resultUrl = URL.createObjectURL(preview);
}

export function publishResult(
  item: QueueItem,
  record: QueueRecord,
  bytes: Uint8Array,
  width: number,
  height: number,
  note: string,
  message: string,
) {
  clearResult(item, record);
  record.bytes = bytes;
  item.resultUrl = URL.createObjectURL(new Blob([bytes as BlobPart], { type: mimeFor(item.kind) }));
  item.resultBytes = bytes.byteLength;
  item.resultWidth = width;
  item.resultHeight = height;
  item.note = note;
  item.status = 'done';
  item.progress = 100;
  item.message = message;
}

export function markFailed(item: QueueItem, record: QueueRecord, message: string) {
  clearResult(item, record);
  item.note = '';
  item.status = 'error';
  item.progress = 0;
  item.message = message;
}

export function markSkipped(item: QueueItem, record: QueueRecord, message: string) {
  clearResult(item, record);
  item.note = '';
  item.status = 'skipped';
  item.progress = 0;
  item.message = message;
}

export function revokeItem(item: QueueItem) {
  URL.revokeObjectURL(item.sourceUrl);
  if (item.resultUrl.startsWith('blob:')) URL.revokeObjectURL(item.resultUrl);
}

export function downloadQueue(items: readonly QueueItem[], records: ReadonlyMap<string, QueueRecord>, zipName: string) {
  const files = collectDownloads(
    items.map((item) => ({
      status: item.status,
      filename: item.filename,
      bytes: records.get(item.id)?.bytes ?? null,
    })),
  );
  if (files.length === 0) return;
  if (files.length === 1) {
    saveBlob(new Blob([files[0].bytes as BlobPart]), files[0].filename);
    return;
  }
  saveBlob(new Blob([archiveDownloads(files) as BlobPart]), zipName);
}

export function downloadOne(item: QueueItem, record: QueueRecord | undefined) {
  if (!record?.bytes || item.status !== 'done') return;
  saveBlob(new Blob([record.bytes as BlobPart], { type: mimeFor(item.kind) }), item.filename);
}

function clearResult(item: QueueItem, record: QueueRecord) {
  if (item.resultUrl.startsWith('blob:')) URL.revokeObjectURL(item.resultUrl);
  item.resultUrl = '';
  item.resultBytes = 0;
  item.resultWidth = 0;
  item.resultHeight = 0;
  record.bytes = null;
}
