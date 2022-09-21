export const EDITOR_TOOLS = [
  { id: 'filters', label: 'Filter & light' },
  { id: 'resize', label: 'Resize' },
  { id: 'crop', label: 'Crop' },
  { id: 'transform', label: 'Transform' },
  { id: 'draw', label: 'Draw' },
  { id: 'text', label: 'Text' },
  { id: 'shapes', label: 'Shapes' },
  { id: 'stickers', label: 'Stickers' },
  { id: 'frame', label: 'Frame' },
  { id: 'corners', label: 'Corners' },
] as const;

export type EditorTool = (typeof EDITOR_TOOLS)[number]['id'];

export const FILTERS = [
  { id: 'grayscale', label: 'Grayscale' },
  { id: 'sepia', label: 'Sepia' },
  { id: 'invert', label: 'Invert' },
  { id: 'blur', label: 'Blur' },
  { id: 'sharpen', label: 'Sharpen' },
] as const;

export type FilterId = (typeof FILTERS)[number]['id'];

export const STICKERS = [
  { id: 'smiley', label: 'Smiley' },
  { id: 'heart', label: 'Heart' },
  { id: 'star', label: 'Star' },
  { id: 'sun', label: 'Sun' },
  { id: 'cloud', label: 'Cloud' },
] as const;

export type StickerId = (typeof STICKERS)[number]['id'];

export type ShapeKind = 'rectangle' | 'ellipse' | 'line';
