import { phrase } from '../i18n/phrase';

export type AcceptedFile = {
  name: string;
  type: string;
  file: File;
};

export type RejectedFile = {
  name: string;
  reason: string;
};

const JPEG = new Set(['image/jpeg', 'image/jpg']);
const PNG = new Set(['image/png', 'image/x-png']);

export function acceptFiles(files: readonly File[]): {
  accepted: AcceptedFile[];
  rejected: RejectedFile[];
} {
  const accepted: AcceptedFile[] = [];
  const rejected: RejectedFile[] = [];
  for (const file of files) {
    const name = file.name || 'Untitled';
    if (isJpegOrPng(file)) {
      accepted.push({ name, type: file.type, file });
    } else {
      rejected.push({
        name,
        reason: phrase('reason.jpgPng'),
      });
    }
  }
  return { accepted, rejected };
}

function isJpegOrPng(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  if (JPEG.has(type) || PNG.has(type)) return true;
  if (type && type !== 'application/octet-stream') return false;
  return /\.(jpe?g|png)$/i.test(file.name || '');
}
