import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight,
  ArrowUpFromLine,
  Check,
  Code,
  Crop,
  Download,
  Droplet,
  FileImage,
  FileOutput,
  Frame,
  Lock,
  MessageCircle,
  Minimize2,
  Moon,
  Pencil,
  Plus,
  Redo2,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Scaling,
  ScanFace,
  Shapes,
  SlidersHorizontal,
  SquareRoundCorner,
  SquareUser,
  Sticker,
  Sun,
  Type,
  Undo2,
  Upload,
  X,
} from 'lucide-react';

const stroke = 1.8;

function mark(Icon: LucideIcon, size: number, strokeWidth = stroke) {
  function Glyph({ size: next = size }: { size?: number }) {
    return <Icon size={next} strokeWidth={strokeWidth} aria-hidden="true" />;
  }
  Glyph.displayName = Icon.displayName ?? 'Icon';
  return Glyph;
}

function draw(Icon: LucideIcon | undefined, size: number) {
  if (!Icon) return null;
  return <Icon size={size} strokeWidth={stroke} aria-hidden="true" />;
}

const TOOLS: Record<string, LucideIcon> = {
  'remove-background': SquareUser,
  upscale: ArrowUpFromLine,
  'blur-face': ScanFace,
  compress: Minimize2,
  resize: Scaling,
  crop: Crop,
  rotate: RotateCw,
  'convert-to-jpg': FileImage,
  'convert-from-jpg': FileOutput,
  'html-to-image': Code,
  'photo-editor': SlidersHorizontal,
  watermark: Droplet,
  meme: MessageCircle,
};

const EDITOR: Record<string, LucideIcon> = {
  filters: SlidersHorizontal,
  resize: Scaling,
  crop: Crop,
  transform: RotateCw,
  draw: Pencil,
  text: Type,
  shapes: Shapes,
  stickers: Sticker,
  frame: Frame,
  corners: SquareRoundCorner,
};

export function ToolGlyph({ id, size = 22 }: { id: string; size?: number }) {
  return draw(TOOLS[id], size);
}

export function EditorGlyph({ id, size = 20 }: { id: string; size?: number }) {
  return draw(EDITOR[id], size);
}

export const IconUpload = mark(Upload, 30);
export const IconPlus = mark(Plus, 18);
export const IconCheck = mark(Check, 12, 2.4);
export const IconX = mark(X, 12, 2.2);
export const IconDownload = mark(Download, 13);
export const IconSun = mark(Sun, 16);
export const IconMoon = mark(Moon, 16);
export const IconLock = mark(Lock, 12, 2.2);
export const IconCode = mark(Code, 30);
export const IconUndo = mark(Undo2, 16);
export const IconRedo = mark(Redo2, 16);
export const IconArrow = mark(ArrowRight, 16);
export const IconRotateLeft = mark(RotateCcw, 22);
export const IconRotateRight = mark(RotateCw, 22);
export const IconRotateHalf = mark(RefreshCw, 22);
