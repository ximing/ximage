export const CONVERT_OUTPUTS = ['jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff'] as const;

export type ConvertOutput = (typeof CONVERT_OUTPUTS)[number];

export function outputLabel(output: ConvertOutput): string {
  switch (output) {
    case 'jpeg':
      return 'JPG';
    case 'png':
      return 'PNG';
    case 'webp':
      return 'WEBP';
    case 'gif':
      return 'GIF';
    case 'bmp':
      return 'BMP';
    case 'tiff':
      return 'TIFF';
  }
}

export function outputExtension(output: ConvertOutput): string {
  return output === 'jpeg' ? 'jpg' : output;
}
