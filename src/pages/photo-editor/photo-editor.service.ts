import { Service } from '@rabjs/react';
import {
  Canvas,
  Canvas2dFilterBackend,
  Ellipse,
  FabricImage,
  IText,
  Line,
  PencilBrush,
  Rect,
  filters,
  setFilterBackend,
} from 'fabric';
import type { FabricObject } from 'fabric';
import {
  canvasToBlob,
  cloneCanvas,
  cropCanvas,
  fileToCanvas,
  frameCanvas,
  paintSource,
  renderTransform,
  resizeCanvas,
  roundCornersCanvas,
} from '../../browser/editor-pixels';
import { drawSticker } from '../../browser/editor-stickers';
import { saveBlob } from '../../domain/download';
import { acceptEditorFiles, editedFilename, type EditorRejection, type ExportFormat } from '../../tools/photo-editor/accept';
import {
  FILTERS,
  type EditorTool,
  type FilterId,
  type ShapeKind,
  type StickerId,
} from '../../tools/photo-editor/catalog';
import { phrase } from '../../i18n/phrase';
import {
  clampEditorCrop,
  clampedRadius,
  cropBoxForRatio,
  framePixels,
  framedSize,
  identityTransform,
  isIdentityTransform,
  lockedResize,
  transformedSize,
  type ResizeAxis,
  type TransformSpec,
} from '../../tools/photo-editor/geometry';

type EditorSession = {
  canvas: Canvas | null;
  frame: HTMLElement | null;
  document: HTMLCanvasElement | null;
  undo: HTMLCanvasElement | null;
  redo: HTMLCanvasElement | null;
  preview: HTMLCanvasElement | null;
  pending: TransformSpec;
  base: FabricImage | null;
  marks: FabricObject[];
  guide: FabricObject | null;
  liveText: IText | null;
};

const sessions = new WeakMap<PhotoEditorService, EditorSession>();
let filterBackendReady = false;

export class PhotoEditorService extends Service {
  fileName = '';
  hasImage = false;
  /** Unapplied edits since the last successful apply or save. */
  dirty = false;
  /** Bumps when the source canvas is replaced, so filter thumbnails rebuild. */
  revision = 0;
  width = 0;
  height = 0;
  tool: EditorTool | '' = '';
  format: ExportFormat = 'png';
  zoom = 100;
  autoFit = true;
  dragging = false;
  rejections: EditorRejection[] = [];
  bannerError = '';
  canUndo = false;
  canRedo = false;
  filter: FilterId | '' = '';
  resizeWidthText = '';
  resizeHeightText = '';
  resizeEdited: ResizeAxis = 'width';
  lockAspect = true;
  cropXText = '0';
  cropYText = '0';
  cropWidthText = '';
  cropHeightText = '';
  brushColor = '#ff5a1f';
  brushSize = 12;
  text = '';
  textColor = '#172033';
  shapeColor = '#ff5a1f';
  frameSize = 24;
  frameColor = '#172033';
  cornerRadius = 50;

  get resizeResult(): string {
    const source = sessionOf(this).document;
    if (!source) return '';
    try {
      const size = lockedResize(
        source.width,
        source.height,
        Number(this.resizeWidthText),
        Number(this.resizeHeightText),
        this.lockAspect,
        this.resizeEdited,
      );
      return `${size.width} × ${size.height} px`;
    } catch (error) {
      return messageOf(error, '');
    }
  }

  get cropSummary(): string {
    const source = sessionOf(this).document;
    if (!source) return '';
    const box = clampEditorCrop({
      x: Number(this.cropXText),
      y: Number(this.cropYText),
      width: Number(this.cropWidthText),
      height: Number(this.cropHeightText),
    }, source.width, source.height);
    if (box.width < 1 || box.height < 1) return phrase('error.cropOutside');
    return phrase('caption.cropAt', { width: box.width, height: box.height, x: box.x, y: box.y });
  }

  get frameSummary(): string {
    const source = sessionOf(this).document;
    if (!source) return '';
    const size = framedSize(source.width, source.height, this.frameSize);
    if (framePixels(this.frameSize) < 1) return phrase('error.frameSize');
    return `${size.width} × ${size.height} px`;
  }

  get cornerSummary(): string {
    const source = sessionOf(this).document;
    if (!source) return '';
    const radius = clampedRadius(this.cornerRadius, source.width, source.height);
    if (radius <= 0) return phrase('error.cornerRadius');
    return phrase('caption.radiusNote', { radius });
  }

  mount(frame: HTMLElement) {
    this.unmount();
    ensureFilterBackend();
    const element = document.createElement('canvas');
    frame.replaceChildren(element);
    const canvas = new Canvas(element, {
      enableRetinaScaling: false,
      preserveObjectStacking: true,
      backgroundColor: 'rgba(0,0,0,0)',
      selection: true,
      containerClass: 'editor-canvas',
    });
    const session = sessionOf(this);
    session.canvas = canvas;
    session.frame = frame;
    canvas.on('path:created', (event) => {
      sessionOf(this).marks.push(event.path);
      this.touch();
    });
    canvas.on('object:modified', () => {
      this.touch();
    });
    canvas.on('text:changed', (event) => {
      const live = sessionOf(this).liveText;
      if (event.target !== live) return;
      this.text = event.target.text || '';
      this.touch();
    });
    const source = session.preview ?? session.document;
    if (source) {
      this.present(source);
      this.syncToolMode();
      this.fitToFrame();
    }
  }

  unmount() {
    const session = sessionOf(this);
    const canvas = session.canvas;
    session.canvas = null;
    session.base = null;
    session.marks = [];
    session.guide = null;
    session.liveText = null;
    session.frame = null;
    if (!canvas) return;
    void canvas.dispose().catch(() => undefined);
  }

  release() {
    this.unmount();
    const session = sessionOf(this);
    session.document = null;
    session.undo = null;
    session.redo = null;
    session.preview = null;
    session.pending = identityTransform();
    this.hasImage = false;
    this.dirty = false;
    this.revision += 1;
    this.fileName = '';
    this.width = 0;
    this.height = 0;
    this.canUndo = false;
    this.canRedo = false;
    this.tool = '';
    this.filter = '';
    this.bannerError = '';
    this.rejections = [];
    this.dragging = false;
  }

  async openFiles(files: readonly File[]) {
    const result = acceptEditorFiles(files);
    this.rejections = result.rejected;
    this.bannerError = '';
    this.dragging = false;
    if (!result.accepted) return;
    try {
      const canvas = await fileToCanvas(result.accepted);
      this.install(canvas, result.accepted.name || 'image');
    } catch (error) {
      this.bannerError = messageOf(error, phrase('error.read'));
    }
  }

  setDragging(value: boolean) {
    this.dragging = value;
  }

  selectTool(tool: EditorTool) {
    if (!this.hasImage) return;
    if (this.tool === tool) {
      this.closeTool();
      return;
    }
    this.leaveTool();
    this.tool = tool;
    this.bannerError = '';
    const source = sessionOf(this).document;
    if (source) this.present(source);
    this.syncToolMode();
  }

  closeTool() {
    this.leaveTool();
    this.tool = '';
    this.bannerError = '';
    const source = sessionOf(this).document;
    if (source) this.present(source);
    this.syncToolMode();
  }

  setFormat(format: ExportFormat) {
    this.format = format === 'jpg' ? 'jpg' : 'png';
  }

  setZoom(percent: number, anchor?: { x: number; y: number }) {
    this.autoFit = false;
    this.applyZoom(percent, anchor);
  }

  zoomBy(delta: number) {
    const frame = sessionOf(this).frame;
    const anchor = frame
      ? { x: frame.clientWidth / 2, y: frame.clientHeight / 2 }
      : undefined;
    this.setZoom(this.zoom + delta, anchor);
  }

  fit() {
    this.autoFit = true;
    this.fitToFrame();
  }

  /** Refit after the canvas viewport changes, unless the user has chosen a zoom. */
  noteFrameResize() {
    if (this.autoFit) this.fitToFrame();
  }

  undo() {
    this.swapHistory('undo');
  }

  redo() {
    this.swapHistory('redo');
  }

  chooseFilter(id: FilterId) {
    if (!FILTERS.some((item) => item.id === id)) return;
    this.filter = id;
    this.bannerError = '';
    this.touch();
    const image = sessionOf(this).base;
    if (!image) return;
    this.paintFilter(image);
    sessionOf(this).canvas?.renderAll();
  }

  clearFilter() {
    this.filter = '';
    this.bannerError = '';
    const image = sessionOf(this).base;
    if (!image) return;
    this.paintFilter(image);
    sessionOf(this).canvas?.renderAll();
  }

  sourceCanvas(): HTMLCanvasElement | null {
    return sessionOf(this).document;
  }

  setResizeWidth(value: string) {
    this.resizeWidthText = value;
    this.resizeEdited = 'width';
    this.syncLockedResize('width');
    this.touch();
  }

  setResizeHeight(value: string) {
    this.resizeHeightText = value;
    this.resizeEdited = 'height';
    this.syncLockedResize('height');
    this.touch();
  }

  setLockAspect(locked: boolean) {
    this.lockAspect = locked;
    if (locked) this.syncLockedResize(this.resizeEdited);
    this.touch();
  }

  setCropX(value: string) {
    this.cropXText = value;
    this.refreshCropGuide();
    this.touch();
  }

  setCropY(value: string) {
    this.cropYText = value;
    this.refreshCropGuide();
    this.touch();
  }

  setCropWidth(value: string) {
    this.cropWidthText = value;
    this.refreshCropGuide();
    this.touch();
  }

  setCropHeight(value: string) {
    this.cropHeightText = value;
    this.refreshCropGuide();
    this.touch();
  }

  setCropRatio(ratioWidth: number, ratioHeight: number) {
    const source = sessionOf(this).document;
    if (!source) return;
    const box = cropBoxForRatio(source.width, source.height, ratioWidth, ratioHeight);
    this.cropXText = String(box.x);
    this.cropYText = String(box.y);
    this.cropWidthText = String(box.width);
    this.cropHeightText = String(box.height);
    this.bannerError = '';
    this.refreshCropGuide();
    this.touch();
  }

  rotateLeft() {
    const session = sessionOf(this);
    session.pending.quartersLeft = (session.pending.quartersLeft + 1) % 4;
    this.previewTransform();
  }

  rotateRight() {
    const session = sessionOf(this);
    session.pending.quartersLeft = (session.pending.quartersLeft + 3) % 4;
    this.previewTransform();
  }

  flipHorizontal() {
    const session = sessionOf(this);
    session.pending.flipHorizontal = !session.pending.flipHorizontal;
    this.previewTransform();
  }

  flipVertical() {
    const session = sessionOf(this);
    session.pending.flipVertical = !session.pending.flipVertical;
    this.previewTransform();
  }

  setBrushColor(value: string) {
    if (!value) return;
    this.brushColor = value;
    this.syncBrush();
  }

  setBrushSize(value: number) {
    if (!Number.isFinite(value)) return;
    this.brushSize = Math.min(72, Math.max(1, Math.round(value)));
    this.syncBrush();
  }

  setText(value: string) {
    this.text = value;
    const session = sessionOf(this);
    if (!session.liveText) return;
    session.liveText.set('text', value);
    session.canvas?.renderAll();
    this.touch();
  }

  setTextColor(value: string) {
    if (!value) return;
    this.textColor = value;
    const session = sessionOf(this);
    if (!session.liveText) return;
    session.liveText.set('fill', value);
    session.canvas?.renderAll();
    this.touch();
  }

  addText() {
    if (!sessionOf(this).canvas) return;
    const value = this.text.length > 0 ? this.text : 'Text';
    if (this.text.length === 0) this.text = value;
    const fontSize = Math.max(18, Math.round(Math.min(this.width, this.height) / 10));
    const text = new IText(value, {
      left: this.width / 2,
      top: this.height / 2,
      originX: 'center',
      originY: 'center',
      fill: this.textColor,
      fontFamily: 'Figtree, sans-serif',
      fontSize,
      editable: true,
    });
    sessionOf(this).liveText = text;
    this.addObject(text);
  }

  setShapeColor(value: string) {
    if (!value) return;
    this.shapeColor = value;
  }

  addShape(kind: ShapeKind) {
    const session = sessionOf(this);
    if (!session.canvas || this.width < 1 || this.height < 1) return;
    const offset = (this.overlayCount() % 6) * 16;
    const color = this.shapeColor;
    if (kind === 'rectangle') {
      this.addObject(new Rect({
        left: 32 + offset,
        top: 32 + offset,
        width: Math.max(36, Math.round(this.width * 0.28)),
        height: Math.max(28, Math.round(this.height * 0.2)),
        originX: 'left',
        originY: 'top',
        fill: color,
        stroke: color,
        strokeWidth: 2,
      }));
      return;
    }
    if (kind === 'ellipse') {
      this.addObject(new Ellipse({
        left: 48 + offset,
        top: 48 + offset,
        rx: Math.max(24, Math.round(this.width * 0.14)),
        ry: Math.max(18, Math.round(this.height * 0.12)),
        originX: 'left',
        originY: 'top',
        fill: color,
        stroke: color,
        strokeWidth: 2,
      }));
      return;
    }
    const length = Math.max(48, Math.round(Math.min(this.width, this.height) * 0.4));
    const x = 40 + offset;
    const y = Math.round(this.height / 2) + offset;
    this.addObject(new Line([x, y, x + length, y], {
      stroke: color,
      strokeWidth: 6,
    }));
  }

  addSticker(id: StickerId) {
    const session = sessionOf(this);
    if (!session.canvas || this.width < 1 || this.height < 1) return;
    const sticker = drawSticker(id);
    const target = Math.max(64, Math.round(Math.min(this.width, this.height) * 0.22));
    const scale = target / sticker.width;
    const offset = (this.overlayCount() % 6) * 14;
    this.addObject(new FabricImage(sticker, {
      left: this.width / 2 + offset,
      top: this.height / 2 + offset,
      originX: 'center',
      originY: 'center',
      scaleX: scale,
      scaleY: scale,
    }));
  }

  setFrameSize(value: number) {
    this.frameSize = framePixels(value);
    this.touch();
  }

  setFrameColor(value: string) {
    if (!value) return;
    this.frameColor = value;
    this.touch();
  }

  setCornerRadius(value: number) {
    if (!Number.isFinite(value)) return;
    this.cornerRadius = Math.min(300, Math.max(0, Math.round(value)));
    this.touch();
  }

  apply() {
    this.bannerError = '';
    try {
      switch (this.tool) {
        case 'filters':
          this.applyFilter();
          break;
        case 'resize':
          this.applyResize();
          break;
        case 'crop':
          this.applyCrop();
          break;
        case 'transform':
          this.applyTransform();
          break;
        case 'draw':
        case 'text':
        case 'shapes':
        case 'stickers':
          this.applyMarks();
          break;
        case 'frame':
          this.applyFrame();
          break;
        case 'corners':
          this.applyCorners();
          break;
        default:
          break;
      }
      this.dirty = false;
    } catch (error) {
      this.bannerError = messageOf(error, phrase('error.applyEdit'));
    }
  }

  async save() {
    if (!this.hasImage) return;
    this.bannerError = '';
    try {
      const view = this.exportView();
      const blob = await canvasToBlob(view, this.format);
      saveBlob(blob, editedFilename(this.fileName, this.format));
      this.dirty = false;
    } catch (error) {
      this.bannerError = messageOf(error, phrase('error.saveImage'));
    }
  }

  private install(canvas: HTMLCanvasElement, name: string) {
    const session = sessionOf(this);
    session.document = canvas;
    session.undo = null;
    session.redo = null;
    session.preview = null;
    session.pending = identityTransform();
    this.canUndo = false;
    this.canRedo = false;
    this.fileName = name;
    this.filter = '';
    this.tool = '';
    this.bannerError = '';
    this.autoFit = true;
    this.dirty = false;
    this.revision += 1;
    this.adoptFields(canvas);
    this.hasImage = true;
    if (session.canvas) {
      this.present(canvas);
      this.syncToolMode();
      this.fitToFrame();
    }
  }

  private leaveTool() {
    if (this.tool === 'filters') this.filter = '';
    const session = sessionOf(this);
    session.preview = null;
    session.pending = identityTransform();
    session.liveText = null;
  }

  private present(source: HTMLCanvasElement) {
    const session = sessionOf(this);
    const canvas = session.canvas;
    if (!canvas) return;
    canvas.clear();
    canvas.setDimensions({ width: source.width, height: source.height });
    const image = new FabricImage(cloneCanvas(source), {
      left: 0,
      top: 0,
      originX: 'left',
      originY: 'top',
      selectable: false,
      evented: false,
      objectCaching: false,
      hoverCursor: 'default',
      scaleX: 1,
      scaleY: 1,
    });
    canvas.add(image);
    session.base = image;
    session.marks = [];
    session.guide = null;
    session.liveText = null;
    this.width = source.width;
    this.height = source.height;
    canvas.backgroundColor = 'rgba(0,0,0,0)';
    this.syncDisplay();
    canvas.renderAll();
  }

  private commit(next: HTMLCanvasElement) {
    const session = sessionOf(this);
    session.redo = null;
    session.undo = session.document;
    session.document = next;
    session.preview = null;
    session.pending = identityTransform();
    this.canUndo = session.undo !== null;
    this.canRedo = false;
    this.revision += 1;
    this.adoptFields(next);
    this.present(next);
    this.syncToolMode();
    if (this.autoFit) this.fitToFrame();
  }

  private adoptFields(source: HTMLCanvasElement) {
    this.width = source.width;
    this.height = source.height;
    this.resizeWidthText = String(source.width);
    this.resizeHeightText = String(source.height);
    this.resizeEdited = 'width';
    this.cropXText = '0';
    this.cropYText = '0';
    this.cropWidthText = String(source.width);
    this.cropHeightText = String(source.height);
  }

  private swapHistory(direction: 'undo' | 'redo') {
    const session = sessionOf(this);
    const incoming = direction === 'undo' ? session.undo : session.redo;
    if (!incoming || !session.document) return;
    const current = session.document;
    if (direction === 'undo') {
      session.undo = null;
      session.redo = current;
    } else {
      session.redo = null;
      session.undo = current;
    }
    session.document = incoming;
    session.preview = null;
    session.pending = identityTransform();
    this.canUndo = session.undo !== null;
    this.canRedo = session.redo !== null;
    this.bannerError = '';
    this.dirty = true;
    this.revision += 1;
    this.adoptFields(incoming);
    this.present(incoming);
    this.syncToolMode();
    if (this.autoFit) this.fitToFrame();
  }

  private syncLockedResize(edited: ResizeAxis) {
    if (!this.lockAspect || !this.hasImage) return;
    const source = sessionOf(this).document;
    if (!source) return;
    try {
      const next = lockedResize(
        source.width,
        source.height,
        Number(this.resizeWidthText),
        Number(this.resizeHeightText),
        true,
        edited,
      );
      if (edited === 'width') this.resizeHeightText = String(next.height);
      else this.resizeWidthText = String(next.width);
    } catch {
      // Apply reports a bad size. Keep the other field while the number is incomplete.
    }
  }

  private previewTransform() {
    const session = sessionOf(this);
    const source = session.document;
    if (!source) return;
    if (isIdentityTransform(session.pending)) {
      session.preview = null;
      this.present(source);
      this.syncToolMode();
      return;
    }
    const next = renderTransform(source, session.pending);
    session.preview = next;
    this.present(next);
    this.syncToolMode();
    this.touch();
  }

  private paintFilter(image: FabricImage) {
    ensureFilterBackend();
    image.filters = this.filter ? [filterInstance(this.filter)] : [];
    image.applyFilters();
  }

  private applyFilter() {
    if (!this.filter) throw new Error(phrase('error.chooseFilter'));
    const session = sessionOf(this);
    const image = session.base;
    const source = session.document;
    if (!image || !source) return;
    this.paintFilter(image);
    const next = paintSource(image.getElement(), source.width, source.height);
    this.filter = '';
    this.commit(next);
  }

  private applyResize() {
    const source = sessionOf(this).document;
    if (!source) return;
    const size = lockedResize(
      source.width,
      source.height,
      Number(this.resizeWidthText),
      Number(this.resizeHeightText),
      this.lockAspect,
      this.resizeEdited,
    );
    if (size.width === source.width && size.height === source.height) return;
    this.commit(resizeCanvas(source, size.width, size.height));
  }

  private applyCrop() {
    const source = sessionOf(this).document;
    if (!source) return;
    const box = clampEditorCrop({
      x: Number(this.cropXText),
      y: Number(this.cropYText),
      width: Number(this.cropWidthText),
      height: Number(this.cropHeightText),
    }, source.width, source.height);
    if (box.width < 1 || box.height < 1) throw new Error(phrase('error.cropOutside'));
    if (box.x === 0 && box.y === 0 && box.width === source.width && box.height === source.height) return;
    this.commit(cropCanvas(source, box));
  }

  private applyTransform() {
    const session = sessionOf(this);
    const source = session.document;
    if (!source || isIdentityTransform(session.pending)) return;
    const expected = transformedSize(source.width, source.height, session.pending);
    const next = renderTransform(source, session.pending);
    if (next.width !== expected.width || next.height !== expected.height) {
      throw new Error(phrase('error.transformSize'));
    }
    this.commit(next);
  }

  private applyMarks() {
    if (this.overlayCount() < 1) throw new Error(phrase('error.addSomething'));
    this.commit(this.exportView());
  }

  private applyFrame() {
    const source = sessionOf(this).document;
    if (!source) return;
    const border = framePixels(this.frameSize);
    if (border < 1) throw new Error(phrase('error.frameSize'));
    this.commit(frameCanvas(source, border, this.frameColor));
  }

  private applyCorners() {
    const source = sessionOf(this).document;
    if (!source) return;
    const radius = clampedRadius(this.cornerRadius, source.width, source.height);
    if (radius <= 0) throw new Error(phrase('error.cornerRadius'));
    this.commit(roundCornersCanvas(source, radius));
  }

  private exportView(): HTMLCanvasElement {
    const session = sessionOf(this);
    const canvas = session.canvas;
    if (!canvas) {
      const source = session.preview ?? session.document;
      if (!source) throw new Error(phrase('error.openFirst'));
      return cloneCanvas(source);
    }
    const active = canvas.getActiveObject();
    if (active instanceof IText) active.exitEditing();
    canvas.discardActiveObject();
    const drawing = canvas.isDrawingMode;
    canvas.isDrawingMode = false;
    const guide = session.guide;
    if (guide) canvas.remove(guide);
    session.guide = null;
    canvas.renderAll();
    try {
      return paintSource(canvas.toCanvasElement(1), this.width, this.height);
    } finally {
      canvas.isDrawingMode = drawing;
      if (guide && this.tool === 'crop') {
        canvas.add(guide);
        session.guide = guide;
        canvas.renderAll();
      }
    }
  }

  private addObject(object: FabricObject) {
    const session = sessionOf(this);
    const canvas = session.canvas;
    if (!canvas) return;
    canvas.add(object);
    object.setCoords();
    canvas.setActiveObject(object);
    session.marks.push(object);
    canvas.renderAll();
    this.touch();
  }

  private overlayCount(): number {
    const session = sessionOf(this);
    const canvas = session.canvas;
    if (!canvas) return session.marks.length;
    return canvas.getObjects().filter((object) => object !== session.base && object !== session.guide).length;
  }

  private syncToolMode() {
    const canvas = sessionOf(this).canvas;
    if (!canvas) return;
    canvas.isDrawingMode = this.tool === 'draw';
    if (this.tool === 'draw') this.syncBrush();
    else canvas.freeDrawingBrush = undefined;
    if (this.tool === 'crop') this.refreshCropGuide();
    else this.removeGuide();
  }

  private syncBrush() {
    const canvas = sessionOf(this).canvas;
    if (!canvas || this.tool !== 'draw') return;
    const brush = new PencilBrush(canvas);
    brush.color = this.brushColor;
    brush.width = this.brushSize;
    canvas.freeDrawingBrush = brush;
    canvas.isDrawingMode = true;
  }

  private refreshCropGuide() {
    const session = sessionOf(this);
    const canvas = session.canvas;
    const source = session.document;
    if (!canvas || !source || this.tool !== 'crop') return;
    this.removeGuide();
    const box = clampEditorCrop({
      x: Number(this.cropXText),
      y: Number(this.cropYText),
      width: Number(this.cropWidthText),
      height: Number(this.cropHeightText),
    }, source.width, source.height);
    if (box.width < 1 || box.height < 1) {
      canvas.renderAll();
      return;
    }
    const guide = new Rect({
      left: box.x,
      top: box.y,
      width: box.width,
      height: box.height,
      originX: 'left',
      originY: 'top',
      fill: 'rgba(255, 90, 31, 0.18)',
      stroke: '#ff5a1f',
      strokeWidth: 2,
      selectable: false,
      evented: false,
      objectCaching: false,
    });
    canvas.add(guide);
    session.guide = guide;
    canvas.renderAll();
  }

  private removeGuide() {
    const session = sessionOf(this);
    if (!session.guide || !session.canvas) {
      session.guide = null;
      return;
    }
    session.canvas.remove(session.guide);
    session.guide = null;
  }

  private applyZoom(percent: number, anchor?: { x: number; y: number }) {
    if (!Number.isFinite(percent)) return;
    const frame = sessionOf(this).frame;
    const previous = this.zoom;
    const next = Math.min(400, Math.max(1, Math.round(percent)));
    const origin = anchor && frame && previous > 0
      ? { x: frame.scrollLeft + anchor.x, y: frame.scrollTop + anchor.y }
      : null;
    this.zoom = next;
    this.syncDisplay();
    if (!origin || !frame || !anchor || previous === next) return;
    const ratio = next / previous;
    frame.scrollLeft = origin.x * ratio - anchor.x;
    frame.scrollTop = origin.y * ratio - anchor.y;
  }

  private syncDisplay() {
    const canvas = sessionOf(this).canvas;
    if (!canvas || this.width < 1 || this.height < 1) return;
    const scale = this.zoom / 100;
    canvas.setDimensions({
      width: `${Math.max(1, Math.round(this.width * scale))}px`,
      height: `${Math.max(1, Math.round(this.height * scale))}px`,
    }, { cssOnly: true });
  }

  private touch() {
    this.dirty = true;
  }

  private fitToFrame() {
    if (!this.autoFit) return;
    const frame = sessionOf(this).frame;
    if (!frame || this.width < 1 || this.height < 1) return;
    const style = getComputedStyle(frame);
    const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const padY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const boundsWidth = frame.clientWidth - padX;
    const boundsHeight = frame.clientHeight - padY;
    if (boundsWidth < 8 || boundsHeight < 8) return;
    const scale = Math.min(boundsWidth / this.width, boundsHeight / this.height, 1);
    this.zoom = Math.min(100, Math.max(1, Math.floor(scale * 100)));
    this.syncDisplay();
    frame.scrollLeft = 0;
    frame.scrollTop = 0;
  }
}

function sessionOf(service: PhotoEditorService): EditorSession {
  let session = sessions.get(service);
  if (!session) {
    session = {
      canvas: null,
      frame: null,
      document: null,
      undo: null,
      redo: null,
      preview: null,
      pending: identityTransform(),
      base: null,
      marks: [],
      guide: null,
      liveText: null,
    };
    sessions.set(service, session);
  }
  return session;
}

function ensureFilterBackend() {
  if (filterBackendReady) return;
  setFilterBackend(new Canvas2dFilterBackend());
  filterBackendReady = true;
}

function filterInstance(id: FilterId) {
  switch (id) {
    case 'grayscale':
      return new filters.Grayscale();
    case 'sepia':
      return new filters.Sepia();
    case 'invert':
      return new filters.Invert();
    case 'blur':
      return new filters.Blur({ blur: 0.45 });
    case 'sharpen':
      return new filters.Convolute({
        matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0],
      });
    default: {
      const neverId: never = id;
      throw new Error(`Cannot apply ${String(neverId)}.`);
    }
  }
}

function messageOf(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}
