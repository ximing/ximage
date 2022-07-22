import { phrase } from '../../i18n/phrase';
export type OrientationFilter = 'all' | 'landscape' | 'portrait';

export function normalizeDegrees(degrees: number): number {
  if (!Number.isFinite(degrees)) throw new Error(phrase('error.degrees'));
  return ((degrees % 360) + 360) % 360;
}

/** 0, 1, 2, 3 for 0/90/180/270 clockwise, or null when the angle is not a right angle. */
export function quarterTurns(degrees: number): 0 | 1 | 2 | 3 | null {
  const normalized = normalizeDegrees(degrees);
  const turns = ((Math.round(normalized / 90) % 4) + 4) % 4;
  const target = turns * 90;
  const diff = Math.abs(normalized - target);
  const nearZero = turns === 0 && Math.abs(normalized - 360) < 1e-4;
  if (nearZero || diff < 1e-4) return turns as 0 | 1 | 2 | 3;
  return null;
}

export function rotatedDimensions(width: number, height: number, degrees: number): { width: number; height: number } {
  if (!(width > 0) || !(height > 0) || !Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error(phrase('error.unusableSize'));
  }
  const quarter = quarterTurns(degrees);
  if (quarter === 0 || quarter === 2) return { width: Math.round(width), height: Math.round(height) };
  if (quarter === 1 || quarter === 3) return { width: Math.round(height), height: Math.round(width) };
  const radians = (normalizeDegrees(degrees) * Math.PI) / 180;
  const cosine = Math.abs(Math.cos(radians));
  const sine = Math.abs(Math.sin(radians));
  return {
    width: Math.max(1, Math.round(width * cosine + height * sine)),
    height: Math.max(1, Math.round(width * sine + height * cosine)),
  };
}

export function shouldRotateImage(width: number, height: number, filter: OrientationFilter): boolean {
  if (filter === 'all') return true;
  if (!(width > 0) || !(height > 0) || width === height) return false;
  if (filter === 'landscape') return width > height;
  return height > width;
}

export function skipReason(width: number, height: number): string {
  if (width === height) return phrase('note.skippedSquare');
  if (width > height) return phrase('note.skippedLandscape');
  return phrase('note.skippedPortrait');
}
