export function toolFilename(originalName: string, label: string, extension: string, taken: Set<string>): string {
  const stem = originalName.replace(/\.[^.]+$/u, '').replace(/[/\\?%*:|"<>]/g, '-').trim() || 'image';
  const ext = extension.replace(/^\./u, '');
  let filename = `${stem}-${label}.${ext}`;
  let suffix = 2;
  while (taken.has(filename)) {
    filename = `${stem}-${label}-${suffix}.${ext}`;
    suffix += 1;
  }
  taken.add(filename);
  return filename;
}
