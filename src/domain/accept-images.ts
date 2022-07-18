import { phrase } from '../i18n/phrase';

export type ImageKind = 'jpeg' | 'png' | 'gif' | 'svg' | 'webp' | 'bmp' | 'tiff';

export type AcceptedImage = {
  name: string;
  type: string;
  file: File;
  kind: ImageKind;
};

export type RejectedImage = {
  name: string;
  reason: string;
};

const LABELS: Record<ImageKind, string> = {
  jpeg: 'JPG',
  png: 'PNG',
  gif: 'GIF',
  svg: 'SVG',
  webp: 'WEBP',
  bmp: 'BMP',
  tiff: 'TIFF',
};

const MIME: Record<string, ImageKind> = {
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpeg',
  'image/pjpeg': 'jpeg',
  'image/png': 'png',
  'image/x-png': 'png',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
  'image/x-ms-bmp': 'bmp',
  'image/tiff': 'tiff',
  'image/tif': 'tiff',
};

export const COMPRESS_KINDS = ['jpeg', 'png', 'svg', 'gif'] as const satisfies readonly ImageKind[];
export const CROP_KINDS = ['jpeg', 'png', 'gif'] as const satisfies readonly ImageKind[];

export function allowedReason(allowed: readonly ImageKind[]): string {
  const labels = allowed.map((kind) => LABELS[kind]);
  if (labels.length === 0) return phrase('reason.none');
  return phrase('reason.only', { types: labels.join(', ') });
}

export function extensionFor(kind: ImageKind): string {
  return kind === 'jpeg' ? 'jpg' : kind;
}

export function mimeFor(kind: ImageKind): string {
  switch (kind) {
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'svg':
      return 'image/svg+xml';
    case 'webp':
      return 'image/webp';
    case 'bmp':
      return 'image/bmp';
    case 'tiff':
      return 'image/tiff';
  }
}

export function detectImageKind(file: Pick<File, 'name' | 'type'>): ImageKind | null {
  const type = (file.type || '').toLowerCase().split(';')[0].trim();
  if (MIME[type]) return MIME[type];
  if (type && type !== 'application/octet-stream') return null;
  return kindFromName(file.name || '');
}

export function acceptImageFiles(
  files: readonly File[],
  allowed: readonly ImageKind[],
): { accepted: AcceptedImage[]; rejected: RejectedImage[] } {
  const allow = new Set(allowed);
  const reason = allowedReason(allowed);
  const accepted: AcceptedImage[] = [];
  const rejected: RejectedImage[] = [];
  for (const file of files) {
    const name = file.name || 'Untitled';
    const kind = detectImageKind(file);
    if (kind && allow.has(kind)) {
      accepted.push({ name, type: file.type, file, kind });
    } else {
      rejected.push({ name, reason });
    }
  }
  return { accepted, rejected };
}

function kindFromName(name: string): ImageKind | null {
  const lower = name.toLowerCase();
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'jpeg';
  if (lower.endsWith('.png')) return 'png';
  if (lower.endsWith('.gif')) return 'gif';
  if (lower.endsWith('.svg')) return 'svg';
  if (lower.endsWith('.webp')) return 'webp';
  if (lower.endsWith('.bmp') || lower.endsWith('.dib')) return 'bmp';
  if (lower.endsWith('.tif') || lower.endsWith('.tiff')) return 'tiff';
  return null;
}
