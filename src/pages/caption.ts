import { formatBytes } from '../domain/bytes';
import { phrase } from '../i18n/phrase';

export function resultCaption(
  item: {
    sourceWidth: number;
    sourceHeight: number;
    resultWidth: number;
    resultHeight: number;
    originalBytes: number;
    resultBytes: number;
    status: string;
  },
  prefix = '',
): string {
  const size = item.sourceWidth > 0 ? `${item.sourceWidth} × ${item.sourceHeight}, ` : '';
  const bytes = formatBytes(item.originalBytes);
  if (item.status !== 'done') return phrase('caption.original', { prefix, size, bytes });
  const result = item.resultWidth > 0 ? `${item.resultWidth} × ${item.resultHeight}, ` : '';
  return phrase('caption.done', {
    prefix,
    size,
    bytes,
    result,
    resultBytes: formatBytes(item.resultBytes),
  });
}
