import { clampCropRect, type CropRect } from '../crop/rect';

export type BlurRect = CropRect;

export function clampBlurRect(rect: BlurRect, imageWidth: number, imageHeight: number): BlurRect {
  return clampCropRect(rect, imageWidth, imageHeight);
}

export function faceRect(
  box: { originX: number; originY: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number,
): BlurRect {
  const padX = box.width * 0.12;
  const padY = box.height * 0.18;
  return clampBlurRect({
    x: box.originX - padX,
    y: box.originY - padY * 0.65,
    width: box.width + padX * 2,
    height: box.height + padY * 1.35,
  }, imageWidth, imageHeight);
}

export function pointerToImagePixel(
  boundsWidth: number,
  boundsHeight: number,
  naturalWidth: number,
  naturalHeight: number,
  offsetX: number,
  offsetY: number,
): { x: number; y: number } {
  const width = boundsWidth > 0 ? boundsWidth : 1;
  const height = boundsHeight > 0 ? boundsHeight : 1;
  return {
    x: (offsetX / width) * naturalWidth,
    y: (offsetY / height) * naturalHeight,
  };
}
