import { phrase } from '../../i18n/phrase';

export const JPEG_QUALITY = 90;

export type ConvertSource = 'jpeg' | 'png' | 'gif' | 'tiff' | 'psd' | 'svg' | 'webp' | 'bmp' | 'avif' | 'heic' | 'raw';

export type NamedFile = {
  name: string;
  type: string;
};

const SOURCE_BY_MIME: Record<string, ConvertSource> = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/pjpeg': 'jpeg',
  'image/png': 'png',
  'image/x-png': 'png',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/x-ms-bmp': 'bmp',
  'image/avif': 'avif',
  'image/tiff': 'tiff',
  'image/tif': 'tiff',
  'image/x-tiff': 'tiff',
  'image/vnd.adobe.photoshop': 'psd',
  'image/psd': 'psd',
  'application/x-photoshop': 'psd',
  'application/photoshop': 'psd',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heic',
  'image/heic-sequence': 'heic',
  'image/heif-sequence': 'heic',
};

const SOURCE_BY_EXT: Record<string, ConvertSource> = {
  jpg: 'jpeg',
  jpeg: 'jpeg',
  jpe: 'jpeg',
  jfif: 'jpeg',
  png: 'png',
  gif: 'gif',
  bmp: 'bmp',
  dib: 'bmp',
  avif: 'avif',
  tif: 'tiff',
  tiff: 'tiff',
  psd: 'psd',
  svg: 'svg',
  webp: 'webp',
  heic: 'heic',
  heif: 'heic',
  crw: 'raw',
  cr2: 'raw',
  cr3: 'raw',
  dng: 'raw',
  raf: 'raw',
  nef: 'raw',
  nrw: 'raw',
  orf: 'raw',
  rw2: 'raw',
  pef: 'raw',
  arw: 'raw',
  srf: 'raw',
  sr2: 'raw',
  raw: 'raw',
};

export const UNSUPPORTED_SOURCE_REASON = phrase('reason.unsupportedSource');

export function measureKind(source: ConvertSource): 'svg' | 'gif' | 'png' | null {
  if (source === 'svg') return 'svg';
  if (source === 'gif') return 'gif';
  if (source === 'tiff' || source === 'psd' || source === 'heic' || source === 'raw') return null;
  return 'png';
}

export function acceptConvertToJpg<T extends NamedFile>(files: readonly T[]): {
  accepted: { name: string; source: ConvertSource; file: T }[];
  rejected: { name: string; reason: string }[];
} {
  const accepted: { name: string; source: ConvertSource; file: T }[] = [];
  const rejected: { name: string; reason: string }[] = [];
  for (const file of files) {
    const name = file.name || 'Untitled';
    const source = sourceKind(file);
    if (!source) {
      rejected.push({ name, reason: UNSUPPORTED_SOURCE_REASON });
      continue;
    }
    accepted.push({ name, source, file });
  }
  return { accepted, rejected };
}

function sourceKind(file: NamedFile): ConvertSource | null {
  const extension = extensionOf(file.name);
  if (SOURCE_BY_EXT[extension]) return SOURCE_BY_EXT[extension];
  const mime = mimeOf(file.type);
  return SOURCE_BY_MIME[mime] ?? null;
}

function mimeOf(type: string): string {
  return (type || '').toLowerCase().split(';')[0].trim();
}

function extensionOf(name: string): string {
  const base = (name || '').split(/[/\\]/u).pop() ?? '';
  const dot = base.lastIndexOf('.');
  if (dot <= 0) return '';
  return base.slice(dot + 1).toLowerCase();
}
