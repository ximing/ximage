import { phrase } from '../i18n/phrase';
export function canvasToBytes(canvas: HTMLCanvasElement, kind: 'jpeg' | 'png'): Promise<Uint8Array> {
  const type = kind === 'jpeg' ? 'image/jpeg' : 'image/png';
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error(phrase('error.encode')));
        return;
      }
      blob.arrayBuffer().then(
        (buffer) => {
          const bytes = new Uint8Array(buffer);
          if (bytes.byteLength === 0) reject(new Error(phrase('error.empty')));
          else resolve(bytes);
        },
        () => reject(new Error(phrase('error.encode'))),
      );
    }, type, kind === 'jpeg' ? 0.92 : undefined);
  });
}
