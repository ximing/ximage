import { phrase } from '../../i18n/phrase';

export type EditorRejection = {
  name: string;
  reason: string;
};

export type ExportFormat = 'png' | 'jpg';

const JPEG = new Set(['image/jpeg', 'image/jpg']);
const PNG = new Set(['image/png', 'image/x-png']);

export function acceptEditorFiles(files: readonly File[]): {
  accepted: File | null;
  rejected: EditorRejection[];
} {
  const rejected: EditorRejection[] = [];
  let accepted: File | null = null;
  for (const file of files) {
    const name = file.name || 'Untitled';
    if (!isJpegOrPng(file)) {
      rejected.push({ name, reason: phrase('reason.editJpgPng') });
      continue;
    }
    if (accepted) {
      rejected.push({ name, reason: phrase('reason.editOne') });
      continue;
    }
    accepted = file;
  }
  return { accepted, rejected };
}

export function editedFilename(originalName: string, format: ExportFormat): string {
  const stem = (originalName || 'image').replace(/\.[^.]+$/u, '').replace(/[/\\?%*:|"<>]/g, '-').trim() || 'image';
  return `${stem}-edited.${format === 'jpg' ? 'jpg' : 'png'}`;
}

function isJpegOrPng(file: Pick<File, 'name' | 'type'>): boolean {
  const type = (file.type || '').toLowerCase().split(';')[0].trim();
  if (JPEG.has(type) || PNG.has(type)) return true;
  if (type && type !== 'application/octet-stream') return false;
  return /\.(jpe?g|png)$/i.test(file.name || '');
}
