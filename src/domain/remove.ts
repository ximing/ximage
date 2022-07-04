import { newSession, rembgConfig, remove, type BaseSession } from '@bunnio/rembg-web';
import * as ort from 'onnxruntime-web';

export type RemovalProgress = {
  progress: number;
  message: string;
};

export type Cutout = {
  width: number;
  height: number;
  png: Blob;
};

let sessionPromise: Promise<BaseSession> | null = null;

function progressMessage(progress: number): string {
  if (progress < 35) return `Loading the on-device model (${progress}%)`;
  if (progress < 75) return `Finding the subject (${progress}%)`;
  return `Cutting out the background (${progress}%)`;
}

function modelBaseUrl(): string {
  const url = new URL('models/', window.location.href);
  return url.href.replace(/\/$/, '');
}

/**
 * GitHub Pages does not send COOP/COEP, so the threaded WASM runtime cannot start.
 * Leave wasmPaths unset: Vite emits the runtime next to the JS bundle and ORT
 * loads that relative URL.
 */
export function configureOnnxRuntime(): void {
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.proxy = false;
}

async function loadSession(): Promise<BaseSession> {
  if (!sessionPromise) {
    configureOnnxRuntime();
    rembgConfig.setBaseUrl(modelBaseUrl());
    sessionPromise = newSession('u2netp', undefined, {
      numThreads: 1,
      proxy: false,
      simd: true,
      preferWebGPU: false,
      preferWebNN: false,
      executionProviders: ['wasm'],
    }).catch((error: unknown) => {
      sessionPromise = null;
      throw error;
    });
  }
  return sessionPromise;
}

export async function removeBackground(
  input: Blob,
  onProgress?: (progress: RemovalProgress) => void,
): Promise<Cutout> {
  const source = await createImageBitmap(input);
  const width = source.width;
  const height = source.height;
  source.close();
  try {
    const session = await loadSession();
    const png = await remove(input, {
      session,
      onProgress: (info) => {
        onProgress?.({ progress: info.progress, message: progressMessage(info.progress) });
      },
    });
    const fitted = await fitToSource(png, width, height);
    return { width, height, png: fitted };
  } catch (error) {
    const detail = error instanceof Error && error.message ? error.message : 'Unknown error';
    throw new Error(`Background removal failed. ${detail}`);
  }
}

async function fitToSource(png: Blob, width: number, height: number): Promise<Blob> {
  const bitmap = await createImageBitmap(png);
  try {
    if (bitmap.width === width && bitmap.height === height) return png;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas is not available in this browser.');
    context.drawImage(bitmap, 0, 0, width, height);
    return await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) reject(new Error('Could not encode the cutout.'));
        else resolve(blob);
      }, 'image/png');
    });
  } finally {
    bitmap.close();
  }
}
