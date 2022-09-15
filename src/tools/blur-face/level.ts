export type DetectionLevel = 'recommended' | 'low' | 'high';

export const DETECTION_LEVELS = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'low', label: 'Low detection' },
  { id: 'high', label: 'High detection' },
] as const satisfies readonly { id: DetectionLevel; label: string }[];

export function detectionConfidence(level: DetectionLevel): number {
  switch (level) {
    case 'low':
      return 0.75;
    case 'recommended':
      return 0.5;
    case 'high':
      return 0.25;
  }
}
