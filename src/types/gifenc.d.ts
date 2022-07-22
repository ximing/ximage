declare module 'gifenc' {
  export type GifColor = number[];

  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: {
      format?: 'rgb565' | 'rgb444' | 'rgba4444';
      oneBitAlpha?: boolean | number;
      clearAlpha?: boolean;
      clearAlphaThreshold?: number;
      clearAlphaColor?: number;
    },
  ): GifColor[];

  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: GifColor[],
    format?: 'rgb565' | 'rgb444' | 'rgba4444',
  ): Uint8Array;

  export function GIFEncoder(options?: { initialCapacity?: number; auto?: boolean }): {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      options?: {
        palette?: GifColor[] | null;
        transparent?: boolean;
        transparentIndex?: number;
        delay?: number;
        repeat?: number;
        dispose?: number;
        colorDepth?: number;
        first?: boolean;
      },
    ): void;
    finish(): void;
    bytes(): Uint8Array;
  };
}
