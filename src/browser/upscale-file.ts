import type { ImageKind } from '../domain/accept-images';
import { upscaleDimensions, type UpscaleFactor } from '../tools/upscale/scale';
import { assetUrl } from './asset-url';
import { canvasToBytes } from './canvas-bytes';
import { isPhrase, phrase } from '../i18n/phrase';

export type UpscaleOutput = {
  bytes: Uint8Array;
  sourceWidth: number;
  sourceHeight: number;
  width: number;
  height: number;
};

type Progress = (progress: number, message: string) => void;

type Runner = {
  upscale: (
    image: HTMLImageElement | string,
    options: {
      output: 'base64';
      patchSize: number;
      padding: number;
      awaitNextFrame: boolean;
      progress: (amount: number) => void;
    },
  ) => Promise<string>;
  getModel: () => Promise<unknown>;
  dispose: () => Promise<void>;
};

const PATCH_SIZE = 128;
const PATCH_PADDING = 4;
let runnerPromise: Promise<Runner> | null = null;

export async function prepareUpscaler(onProgress?: Progress): Promise<void> {
  onProgress?.(6, phrase('progress.loadingUpscaler'));
  await loadRunner();
}

export async function releaseUpscaler(): Promise<void> {
  const pending = runnerPromise;
  runnerPromise = null;
  if (!pending) return;
  try {
    const runner = await pending;
    await runner.dispose();
  } catch {
    runnerPromise = null;
  }
}

export async function upscaleFile(
  file: Blob,
  kind: ImageKind,
  factor: UpscaleFactor,
  onProgress?: Progress,
): Promise<UpscaleOutput> {
  if (kind !== 'jpeg' && kind !== 'png') throw new Error(phrase('error.upscaleOnly'));
  onProgress?.(4, phrase('progress.loadingUpscaler'));
  const runner = await loadRunner();
  const loaded = await imageFromBlob(file);
  try {
    const sourceWidth = loaded.image.naturalWidth;
    const sourceHeight = loaded.image.naturalHeight;
    if (sourceWidth < 1 || sourceHeight < 1) throw new Error(phrase('error.decode'));
    const target = upscaleDimensions(sourceWidth, sourceHeight, factor);
    const passes = factor / 2;
    let current: HTMLImageElement = loaded.image;
    let currentRevoke: () => void = () => undefined;
    for (let pass = 0; pass < passes; pass += 1) {
      const dataUrl = await runner.upscale(current, {
        output: 'base64',
        patchSize: PATCH_SIZE,
        padding: PATCH_PADDING,
        awaitNextFrame: true,
        progress: (amount) => {
          const fraction = Number.isFinite(amount) ? Math.min(1, Math.max(0, amount)) : 0;
          const progress = Math.round(((pass + fraction) / passes) * 100);
          const shown = Math.max(8, progress);
          onProgress?.(
            shown,
            passes === 1
              ? phrase('progress.upscaling', { progress: shown })
              : phrase('progress.upscalingPass', { pass: pass + 1, passes, progress: shown }),
          );
        },
      });
      if (current !== loaded.image) currentRevoke();
      const next = await imageFromUrl(dataUrl);
      current = next.image;
      currentRevoke = next.revoke;
    }
    try {
      if (current.naturalWidth !== target.width || current.naturalHeight !== target.height) {
        throw new Error(
          phrase('error.upscaleSize', { width: current.naturalWidth, height: current.naturalHeight, targetWidth: target.width, targetHeight: target.height }),
        );
      }
      const canvas = document.createElement('canvas');
      canvas.width = target.width;
      canvas.height = target.height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error(phrase('error.canvas'));
      context.drawImage(current, 0, 0, target.width, target.height);
      const bytes = await canvasToBytes(canvas, kind);
      return {
        bytes,
        sourceWidth,
        sourceHeight,
        width: canvas.width,
        height: canvas.height,
      };
    } finally {
      currentRevoke();
    }
  } finally {
    loaded.revoke();
  }
}

async function loadRunner(): Promise<Runner> {
  if (!runnerPromise) {
    runnerPromise = createRunner().catch((error: unknown) => {
      runnerPromise = null;
      throw error;
    });
  }
  return runnerPromise;
}

async function createRunner(): Promise<Runner> {
  try {
    const [{ default: Upscaler }, tensorflow, modelModule] = await Promise.all([
      import('upscaler'),
      import('@tensorflow/tfjs'),
      import('@upscalerjs/esrgan-slim/2x'),
    ]);
    await prepareTensorflow(tensorflow);
    const model = modelModule.default;
    if (model.scale !== 2) throw new Error(phrase('error.modelScale'));
    const runner = new Upscaler({
      model: {
        ...model,
        path: assetUrl('models/esrgan-slim-2x/model.json'),
      },
    });
    await runner.getModel();
    return runner;
  } catch (error) {
    if (error instanceof Error && isPhrase(error.message)) throw error;
    const detail = error instanceof Error && error.message ? error.message : phrase('error.unknown');
    throw new Error(phrase('error.upscaleLoad', { detail }));
  }
}

async function prepareTensorflow(tensorflow: typeof import('@tensorflow/tfjs')): Promise<void> {
  // WebGL, then CPU. The WASM backend is not registered, so this does not need SharedArrayBuffer.
  try {
    if (await tensorflow.setBackend('webgl')) {
      await tensorflow.ready();
      return;
    }
  } catch {
    // WebGL can be missing in this browser.
  }
  if (!(await tensorflow.setBackend('cpu'))) throw new Error(phrase('error.noBackend'));
  await tensorflow.ready();
}

function imageFromBlob(blob: Blob): Promise<{ image: HTMLImageElement; revoke: () => void }> {
  const url = URL.createObjectURL(blob);
  return imageFromUrl(url).then(
    (loaded) => loaded,
    (error: unknown) => {
      URL.revokeObjectURL(url);
      throw error;
    },
  );
}

function imageFromUrl(url: string): Promise<{ image: HTMLImageElement; revoke: () => void }> {
  const image = new Image();
  image.decoding = 'async';
  const revoke = () => {
    if (url.startsWith('blob:')) URL.revokeObjectURL(url);
  };
  return new Promise((resolve, reject) => {
    image.onload = () => resolve({ image, revoke });
    image.onerror = () => {
      revoke();
      reject(new Error(phrase('error.decode')));
    };
    image.src = url;
  });
}
