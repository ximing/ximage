declare module 'libheif-js/libheif-wasm/libheif-bundle.mjs' {
  export interface HeifHandle {
    get_width(): number;
    get_height(): number;
    is_primary(): boolean;
    free(): void;
    display(target: ImageData, done: (result: ImageData | null) => void): void;
  }

  export interface HeifModule {
    HeifDecoder: new () => {
      decode(data: Uint8Array): HeifHandle[];
    };
  }

  const createLibheif: () => HeifModule | Promise<HeifModule>;
  export default createLibheif;
}
