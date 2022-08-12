import { readSvgSize } from '../tools/resize/svg';
import type { ConvertSource } from '../tools/convert-to-jpg/accept';
import { fileToImageData } from './raster';
import { decodeBmp } from './bmp';
import { openGif } from './gif-codec';
import type { HeifHandle, HeifModule } from 'libheif-js/libheif-wasm/libheif-bundle.mjs';
import type { RawConvert } from 'rawconvert-wasm';
import { isPhrase, phrase } from '../i18n/phrase';

const TIFF_COMPRESSIONS = new Set([1, 3, 4, 5, 6, 7, 8, 32767, 32773, 32809, 34713]);

export async function decodeConvertSource(file: File, source: ConvertSource): Promise<{ image: ImageData; note: string }> {
  switch (source) {
    case 'jpeg':
    case 'png':
    case 'webp':
    case 'avif':
      return { image: await fileToImageData(file), note: '' };
    case 'bmp':
      return decodeBmpFile(file);
    case 'gif':
      return decodeGif(file);
    case 'svg':
      return { image: await decodeSvg(file), note: '' };
    case 'tiff':
      return decodeTiff(file);
    case 'psd':
      return decodePsd(file);
    case 'heic':
      return decodeHeic(file);
    case 'raw':
      return decodeRaw(file);
  }
}

async function decodeBmpFile(file: File): Promise<{ image: ImageData; note: string }> {
  const parsed = decodeBmp(new Uint8Array(await file.arrayBuffer()));
  if (parsed) {
    const pixels = new Uint8ClampedArray(parsed.width * parsed.height * 4);
    pixels.set(parsed.data);
    return { image: new ImageData(pixels, parsed.width, parsed.height), note: '' };
  }
  return { image: await fileToImageData(file), note: '' };
}

async function decodeGif(file: File): Promise<{ image: ImageData; note: string }> {
  const opened = await openGif(file);
  const frame = opened.movie.frames[0];
  if (!frame || opened.movie.width < 1 || opened.movie.height < 1) {
    throw new Error(phrase('error.gifNoConvert'));
  }
  return {
    image: new ImageData(new Uint8ClampedArray(frame.data), opened.movie.width, opened.movie.height),
    note: opened.movie.frames.length > 1 ? phrase('note.gifFirstFrame') : '',
  };
}

async function decodeSvg(file: File): Promise<ImageData> {
  const markup = await file.text();
  const stated = readSvgSize(markup);
  const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
  try {
    const image = await loadImage(url, phrase('error.svgRaster'));
    const width = Math.round(stated?.width || image.naturalWidth);
    const height = Math.round(stated?.height || image.naturalHeight);
    if (width < 1 || height < 1) throw new Error(phrase('error.svgNoSize'));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = context2d(canvas);
    context.drawImage(image, 0, 0, width, height);
    return context.getImageData(0, 0, width, height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function decodeTiff(file: File): Promise<{ image: ImageData; note: string }> {
  try {
    const buffer = await file.arrayBuffer();
    const utif = asUtif(await import('utif'));
    const pages = utif.decode(buffer);
    if (pages.length === 0) throw new Error(phrase('error.tiffNone'));
    const page = pages[0];
    const compression = numberTag(page, 't259') ?? 1;
    if (!TIFF_COMPRESSIONS.has(compression)) {
      throw new Error(phrase('error.tiffCompression', { compression }));
    }
    utif.decodeImage(buffer, page, pages);
    const width = page.width;
    const height = page.height;
    if (!width || !height || !page.data || page.data.byteLength === 0) {
      throw new Error(phrase('error.tiffNoImage'));
    }
    const rgba = utif.toRGBA8(page);
    if (rgba.length < width * height * 4) throw new Error(phrase('error.tiffShort'));
    return {
      image: new ImageData(new Uint8ClampedArray(rgba), width, height),
      note: pages.length > 1 ? phrase('note.tiffFirstPage') : '',
    };
  } catch (error) {
    if (error instanceof Error && isPhrase(error.message)) throw error;
    const detail = error instanceof Error ? error.message : '';
    throw new Error(detail ? phrase('error.tiffDecodeDetail', { detail }) : phrase('error.tiffDecode'));
  }
}

async function decodePsd(file: File): Promise<{ image: ImageData; note: string }> {
  try {
    const { readPsd } = await import('ag-psd');
    const psd = readPsd(await file.arrayBuffer(), {
      skipLayerImageData: true,
      skipThumbnail: true,
      skipLinkedFilesData: true,
      useImageData: true,
    });
    const image = psd.imageData;
    if (!image || image.width < 1 || image.height < 1) {
      throw new Error(phrase('error.psdNone'));
    }
    const rgba = pixelsToRgba(image.data, image.width, image.height);
    return { image: new ImageData(rgba, image.width, image.height), note: '' };
  } catch (error) {
    if (error instanceof Error && isPhrase(error.message)) throw error;
    const detail = error instanceof Error ? error.message : '';
    throw new Error(detail ? phrase('error.psdDecodeDetail', { detail }) : phrase('error.psdDecode'));
  }
}

let heifModule: Promise<HeifModule> | null = null;

async function decodeHeic(file: File): Promise<{ image: ImageData; note: string }> {
  let images: HeifHandle[] = [];
  try {
    const libheif = await loadHeif();
    const decoder = new libheif.HeifDecoder();
    images = decoder.decode(new Uint8Array(await file.arrayBuffer()));
    if (images.length === 0) throw new Error(phrase('error.heicNone'));
    const image = images.find((item) => item.is_primary()) ?? images[0];
    const width = image.get_width();
    const height = image.get_height();
    if (width < 1 || height < 1) throw new Error(phrase('error.heicPixels'));
    const target = new ImageData(width, height);
    await new Promise<void>((resolve, reject) => {
      image.display(target, (result) => {
        if (!result) reject(new Error(phrase('error.heicNone')));
        else resolve();
      });
    });
    if (target.data.length < width * height * 4) throw new Error(phrase('error.heicNone'));
    return {
      image: new ImageData(new Uint8ClampedArray(target.data), width, height),
      note: images.length > 1 ? phrase('note.heicPrimary') : '',
    };
  } catch (error) {
    if (error instanceof Error && isPhrase(error.message)) throw error;
    const detail = error instanceof Error ? error.message : '';
    throw new Error(detail ? phrase('error.heicDecodeDetail', { detail }) : phrase('error.heicNone'));
  } finally {
    for (const image of images) image.free();
  }
}

function loadHeif(): Promise<HeifModule> {
  if (heifModule) return heifModule;
  const pending = import('libheif-js/libheif-wasm/libheif-bundle.mjs')
    .then((mod) => realizeHeif(mod.default))
    .catch((error: unknown) => {
      if (heifModule === pending) heifModule = null;
      throw error;
    });
  heifModule = pending;
  return pending;
}

async function realizeHeif(factory: unknown): Promise<HeifModule> {
  const created = typeof factory === 'function' ? await factory() : factory;
  if (!isHeifModule(created)) throw new Error(phrase('error.heicModule'));
  return created;
}

function isHeifModule(value: unknown): value is HeifModule {
  if (typeof value !== 'object' || value === null) return false;
  const decoder = (value as { HeifDecoder?: unknown }).HeifDecoder;
  return typeof decoder === 'function';
}

let rawConvert: Promise<RawConvert> | null = null;

async function decodeRaw(file: File): Promise<{ image: ImageData; note: string }> {
  try {
    const raw = await loadRaw();
    try {
      const filename = /\.[a-z0-9]+$/iu.test(file.name) ? file.name : 'photo.raw';
      const info = raw.load(await file.arrayBuffer(), filename);
      if (!info || info.width < 1 || info.height < 1) {
        throw new Error(phrase('error.rawNone'));
      }
      const processed = raw.process({
        colorSpace: 'srgb',
        outputBps: 8,
        cameraWhiteBalance: true,
        halfSize: false,
      });
      const rgba = pixelsToRgba(processed.data, processed.width, processed.height, processed.colors, processed.bitsPerSample);
      return { image: new ImageData(rgba, processed.width, processed.height), note: '' };
    } finally {
      try {
        raw.reset();
      } catch {
        rawConvert = null;
      }
    }
  } catch (error) {
    if (error instanceof Error && isPhrase(error.message)) throw error;
    const detail = error instanceof Error ? error.message : '';
    throw new Error(detail ? phrase('error.rawDecodeDetail', { detail }) : phrase('error.rawDecode'));
  }
}

function loadRaw(): Promise<RawConvert> {
  if (!rawConvert) {
    rawConvert = (async () => {
      const [{ RawConvert }, core, wasm] = await Promise.all([
        import('rawconvert-wasm'),
        import('rawconvert-wasm/dist/rawconvert-core.js?url'),
        import('rawconvert-wasm/dist/rawconvert-core.wasm?url'),
      ]);
      // The package looks beside its own file. Vite emits that script elsewhere, so pass the asset URLs.
      return RawConvert.init({ coreUrl: core.default, wasmUrl: wasm.default });
    })().catch((error: unknown) => {
      rawConvert = null;
      throw error;
    });
  }
  return rawConvert;
}

type PixelSource = ArrayLike<number> & { length: number };

function pixelsToRgba(data: PixelSource, width: number, height: number, colors?: number, bitsPerSample?: number): Uint8ClampedArray<ArrayBuffer> {
  if (width < 1 || height < 1) throw new Error(phrase('error.notImage'));
  const count = width * height;
  const bits = bitsPerSample === 16 || data instanceof Uint16Array ? 16 : 8;
  const channels = colors && colors > 0
    ? colors
    : data.length === count * 3
      ? 3
      : data.length === count
        ? 1
        : 4;
  if (data.length < count * channels) throw new Error(phrase('error.notImage'));
  const rgba = new Uint8ClampedArray(count * 4);
  const floatSamples = data instanceof Float32Array;
  for (let index = 0; index < count; index += 1) {
    const src = index * channels;
    const dst = index * 4;
    const sample = (channel: number) => {
      const value = Number(data[src + channel] ?? 0);
      if (floatSamples) return Math.round(Math.min(1, Math.max(0, value)) * 255);
      if (bits === 16) return Math.round((value / 65535) * 255);
      return Math.max(0, Math.min(255, value));
    };
    if (channels === 1) {
      const gray = sample(0);
      rgba[dst] = gray;
      rgba[dst + 1] = gray;
      rgba[dst + 2] = gray;
      rgba[dst + 3] = 255;
    } else {
      rgba[dst] = sample(0);
      rgba[dst + 1] = sample(1);
      rgba[dst + 2] = sample(Math.min(2, channels - 1));
      rgba[dst + 3] = channels >= 4 ? sample(3) : 255;
    }
  }
  return rgba;
}

type TiffPage = {
  width?: number;
  height?: number;
  data?: Uint8Array;
  [tag: string]: unknown;
};

type UtifApi = {
  decode(buffer: ArrayBuffer): TiffPage[];
  decodeImage(buffer: ArrayBuffer, page: TiffPage, pages?: TiffPage[]): void;
  toRGBA8(page: TiffPage): Uint8Array;
};

function asUtif(mod: unknown): UtifApi {
  const record = mod as { default?: UtifApi } & Partial<UtifApi>;
  const api = typeof record.decode === 'function' ? record as UtifApi : record.default;
  if (!api?.decode || !api.decodeImage || !api.toRGBA8) throw new Error(phrase('error.tiffLoad'));
  return api;
}

function numberTag(page: TiffPage, tag: string): number | null {
  const value = page[tag];
  if (Array.isArray(value) && typeof value[0] === 'number') return value[0];
  return null;
}

function loadImage(url: string, message: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(message));
    image.src = url;
  });
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error(phrase('error.canvas'));
  return context;
}
