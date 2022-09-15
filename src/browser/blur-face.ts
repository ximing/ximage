import type { FaceDetector } from '@mediapipe/tasks-vision';
import type { ImageKind } from '../domain/accept-images';
import { clampBlurRect, faceRect, type BlurRect } from '../tools/blur-face/rect';
import { detectionConfidence, type DetectionLevel } from '../tools/blur-face/level';
import { assetUrl } from './asset-url';
import { canvasToBytes } from './canvas-bytes';
import { isPhrase, phrase } from '../i18n/phrase';

export type BlurFaceOutput = {
  bytes: Uint8Array;
  width: number;
  height: number;
  faces: number;
  note: string;
};

type Progress = (progress: number, message: string) => void;

let detectorPromise: Promise<FaceDetector> | null = null;

export async function prepareFaceDetector(onProgress?: Progress): Promise<void> {
  onProgress?.(8, phrase('progress.loadingFace'));
  await loadDetector(onProgress);
}

export async function releaseFaceDetector(): Promise<void> {
  const pending = detectorPromise;
  detectorPromise = null;
  if (!pending) return;
  try {
    const detector = await pending;
    detector.close();
  } catch {
    detectorPromise = null;
  }
}

export async function blurFaceFile(
  file: Blob,
  kind: ImageKind,
  level: DetectionLevel,
  manual: readonly BlurRect[],
  onProgress?: Progress,
): Promise<BlurFaceOutput> {
  if (kind !== 'jpeg' && kind !== 'png') throw new Error(phrase('error.blurOnly'));
  onProgress?.(12, phrase('progress.loadingFace'));
  const detector = await loadDetector(onProgress);
  const confidence = detectionConfidence(level);
  await detector.setOptions({
    runningMode: 'IMAGE',
    minDetectionConfidence: confidence,
  });
  onProgress?.(45, phrase('progress.findingFaces'));
  const bitmap = await createImageBitmap(file);
  const sourceWidth = bitmap.width;
  const sourceHeight = bitmap.height;
  const canvas = document.createElement('canvas');
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    bitmap.close();
    throw new Error(phrase('error.canvas'));
  }
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  if (!canvasFilterWorks()) throw new Error(phrase('error.cannotBlur'));
  let result;
  try {
    result = detector.detect(canvas);
  } catch (error) {
    const detail = error instanceof Error && error.message ? error.message : phrase('error.unknown');
    throw new Error(phrase('error.faceFailed', { detail }));
  }
  const faces: BlurRect[] = [];
  for (const detection of result.detections) {
    const box = detection.boundingBox;
    if (!box || box.width < 1 || box.height < 1) continue;
    const score = detection.categories.reduce((max, category) => Math.max(max, category.score), 0);
    if (detection.categories.length > 0 && score < confidence) continue;
    const rect = faceRect(box, canvas.width, canvas.height);
    if (rect.width >= 1 && rect.height >= 1) faces.push(rect);
  }
  const drawn = manual
    .map((rect) => clampBlurRect(rect, canvas.width, canvas.height))
    .filter((rect) => rect.width >= 1 && rect.height >= 1);
  onProgress?.(70, phrase('progress.blurring'));
  for (const rect of faces) stampBlur(context, canvas, rect, 'ellipse');
  for (const rect of drawn) stampBlur(context, canvas, rect, 'rect');
  if (canvas.width !== sourceWidth || canvas.height !== sourceHeight) {
    throw new Error(phrase('error.blurSize'));
  }
  const bytes = await canvasToBytes(canvas, kind);
  return {
    bytes,
    width: canvas.width,
    height: canvas.height,
    faces: faces.length,
    note: blurNote(faces.length, drawn.length),
  };
}

function blurNote(faces: number, drawn: number): string {
  if (faces === 0 && drawn === 0) return phrase('note.blurNone');
  if (faces === 0) return phrase('note.blurDrawn');
  if (drawn === 0) return faces === 1 ? phrase('note.faceOne') : phrase('note.faces', { count: faces });
  if (faces === 1 && drawn === 1) return phrase('note.oneFaceOneArea');
  if (faces === 1) return phrase('note.oneFaceManyAreas', { count: drawn });
  if (drawn === 1) return phrase('note.manyFacesOneArea', { count: faces });
  return phrase('note.manyFacesManyAreas', { faces, areas: drawn });
}

async function loadDetector(onProgress?: Progress): Promise<FaceDetector> {
  if (!detectorPromise) {
    detectorPromise = createDetector(onProgress).catch((error: unknown) => {
      detectorPromise = null;
      throw error;
    });
  }
  return detectorPromise;
}

async function createDetector(onProgress?: Progress): Promise<FaceDetector> {
  try {
    onProgress?.(15, phrase('progress.loadingFace'));
    const { FaceDetector, FilesetResolver } = await import('@mediapipe/tasks-vision');
    const wasmBase = assetUrl('mediapipe').replace(/\/$/u, '');
    const fileset = await FilesetResolver.forVisionTasks(wasmBase, false);
    onProgress?.(28, phrase('progress.loadingFaceModel'));
    const response = await fetch(assetUrl('models/blaze_face_short_range.tflite'));
    if (!response.ok) throw new Error(phrase('error.faceHttp', { status: response.status }));
    const model = new Uint8Array(await response.arrayBuffer());
    if (model.byteLength < 8) throw new Error(phrase('error.faceEmpty'));
    return await FaceDetector.createFromOptions(fileset, {
      baseOptions: {
        modelAssetBuffer: model,
        delegate: 'CPU',
      },
      runningMode: 'IMAGE',
      minDetectionConfidence: 0.25,
    });
  } catch (error) {
    if (error instanceof Error && isPhrase(error.message)) throw error;
    const detail = error instanceof Error && error.message ? error.message : phrase('error.unknown');
    throw new Error(phrase('error.faceLoad', { detail }));
  }
}

function canvasFilterWorks(): boolean {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context || !('filter' in context)) return false;
  context.filter = 'blur(2px)';
  return context.filter === 'blur(2px)';
}

function stampBlur(
  context: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  rect: BlurRect,
  shape: 'ellipse' | 'rect',
) {
  const radius = Math.max(8, Math.round(Math.min(rect.width, rect.height) * 0.18));
  const pad = radius * 3;
  const left = Math.max(0, Math.floor(rect.x - pad));
  const top = Math.max(0, Math.floor(rect.y - pad));
  const right = Math.min(source.width, Math.ceil(rect.x + rect.width + pad));
  const bottom = Math.min(source.height, Math.ceil(rect.y + rect.height + pad));
  const width = right - left;
  const height = bottom - top;
  if (width < 1 || height < 1) return;
  const layer = document.createElement('canvas');
  layer.width = width;
  layer.height = height;
  const layerContext = layer.getContext('2d');
  if (!layerContext) throw new Error(phrase('error.canvas'));
  layerContext.filter = `blur(${radius}px)`;
  layerContext.drawImage(source, left, top, width, height, 0, 0, width, height);
  layerContext.filter = 'none';
  layerContext.globalCompositeOperation = 'destination-in';
  layerContext.beginPath();
  if (shape === 'ellipse') {
    layerContext.ellipse(
      rect.x - left + rect.width / 2,
      rect.y - top + rect.height / 2,
      Math.max(rect.width / 2, 0.5),
      Math.max(rect.height / 2, 0.5),
      0,
      0,
      Math.PI * 2,
    );
  } else {
    layerContext.rect(rect.x - left, rect.y - top, rect.width, rect.height);
  }
  layerContext.fill();
  context.drawImage(layer, left, top);
}
