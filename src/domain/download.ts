import { zipSync } from 'fflate';

export type Downloadable = {
  filename: string;
  bytes: Uint8Array;
};

export function cutoutFilename(originalName: string, taken: Set<string>): string {
  const stem = originalName.replace(/\.[^.]+$/u, '').replace(/[/\\?%*:|"<>]/g, '-').trim() || 'image';
  let filename = `${stem}-cutout.png`;
  let suffix = 2;
  while (taken.has(filename)) {
    filename = `${stem}-cutout-${suffix}.png`;
    suffix += 1;
  }
  taken.add(filename);
  return filename;
}

export function collectDownloads(
  items: readonly { status: string; filename: string; bytes: Uint8Array | null }[],
): Downloadable[] {
  const downloads: Downloadable[] = [];
  for (const item of items) {
    if (item.status !== 'done' || !item.bytes || item.bytes.byteLength === 0) continue;
    downloads.push({ filename: item.filename, bytes: item.bytes });
  }
  return downloads;
}

export function archiveDownloads(files: readonly Downloadable[]): Uint8Array {
  if (files.length < 2) {
    throw new Error('An archive needs at least two images.');
  }
  const entries: Record<string, Uint8Array> = {};
  for (const file of files) {
    entries[file.filename] = file.bytes;
  }
  return zipSync(entries, { level: 0 });
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
