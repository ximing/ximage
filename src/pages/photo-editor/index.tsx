import { bindServices, observer, useService } from '@rabjs/react';
import { useEffect, useRef, useState } from 'react';
import { EditorGlyph, IconRedo, IconUndo, IconUpload } from '../../components/icons';
import { CheckRow, Seg, SliderRow } from '../../components/tool-workspace';
import { usePhrase, useText } from '../../i18n/use-text';
import { EDITOR_TOOLS, FILTERS, STICKERS, type FilterId } from '../../tools/photo-editor/catalog';
import { CROP_RATIOS } from '../../tools/photo-editor/geometry';
import { filterPreviews } from './filter-previews';
import { PhotoEditorService } from './photo-editor.service';
import './photo-editor.css';

type TextFn = (key: string, params?: Record<string, unknown>) => string;

const SWATCHES = ['#172033', '#ffffff', '#ff5a1f', '#e11d48', '#0f766e', '#f5c518', '#2563eb', '#111111'];

const PhotoEditorPage = observer(() => {
  const editor = useService(PhotoEditorService);
  const t = useText();
  const show = usePhrase();
  const frameRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => editor.release(), [editor]);
  useEffect(() => {
    const frame = frameRef.current;
    if (!editor.hasImage || !frame) return undefined;
    editor.mount(frame);
    const observer = new ResizeObserver(() => editor.noteFrameResize());
    observer.observe(frame);
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = frame.getBoundingClientRect();
      const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
      editor.setZoom(editor.zoom * factor, {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    };
    frame.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      observer.disconnect();
      frame.removeEventListener('wheel', onWheel);
      editor.unmount();
    };
  }, [editor, editor.hasImage]);

  const busy = editor.$model.openFiles.loading || editor.$model.save.loading;

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept="image/x-png,image/jpeg,image/png"
      data-testid="photo-editor-input"
      style={{ display: 'none' }}
      onChange={(event) => {
        const list = event.currentTarget.files;
        if (list) void editor.openFiles(Array.from(list));
        event.currentTarget.value = '';
      }}
    />
  );

  const dropHandlers = {
    onDragOver: (event: React.DragEvent) => {
      event.preventDefault();
      editor.setDragging(true);
    },
    onDragLeave: (event: React.DragEvent) => {
      const next = event.relatedTarget;
      if (next instanceof Node && event.currentTarget.contains(next)) return;
      editor.setDragging(false);
    },
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      const files = Array.from(event.dataTransfer.files);
      void editor.openFiles(files);
    },
  };

  const alerts = (
    <>
      {editor.rejections.length > 0 ? (
        <ul className="rejections">
          {editor.rejections.map((item, index) => (
            <li key={`${item.name}-${index}`} role="alert">
              {item.name}
              {': '}
              {show(item.reason)}
            </li>
          ))}
        </ul>
      ) : null}
      {editor.bannerError ? <p className="banner" role="alert">{show(editor.bannerError)}</p> : null}
    </>
  );

  if (!editor.hasImage) {
    return (
      <div className="page" data-testid="page-photo-editor">
        <main
          className={editor.dragging ? 'bench bench-idle is-drag' : 'bench bench-idle'}
          {...dropHandlers}
        >
          {input}
          <section className="hero" aria-label={t('common.photo')}>
            <div className="drop">
              <div className="drop-ic"><IconUpload /></div>
              <h1>{t('common.dropWhat', { what: t('drop.aPhoto') })}</h1>
              <p className="drop-or">{t('common.or')}</p>
              <button type="button" className="btn btn-primary" onClick={() => inputRef.current?.click()}>
                {t('common.selectImage')}
              </button>
              <p className="drop-copy">{t('page.editor.empty')}</p>
            </div>
            {busy ? (
              <div className="status" role="status">
                <p>{t('common.opening')}</p>
              </div>
            ) : null}
            <div className="canvas-alerts">{alerts}</div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="page" data-testid="page-photo-editor">
      <main className="editor" {...dropHandlers}>
        {input}
        <div className="e-tools" role="toolbar" aria-label={t('common.editorTools')}>
          {EDITOR_TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className="e-tool"
              title={t(`editor.tool.${tool.id}`)}
              aria-label={t(`editor.tool.${tool.id}`)}
              aria-pressed={editor.tool === tool.id}
              onClick={() => editor.selectTool(tool.id)}
            >
              <EditorGlyph id={tool.id} />
            </button>
          ))}
        </div>

        <div className="e-bar">
          <div className="b-group">
            <button type="button" className="icon-btn" aria-label={t('common.undo')} disabled={!editor.canUndo} onClick={() => editor.undo()}>
              <IconUndo />
            </button>
            <button type="button" className="icon-btn" aria-label={t('common.redo')} disabled={!editor.canRedo} onClick={() => editor.redo()}>
              <IconRedo />
            </button>
          </div>
          <span className="b-sep" />
          <span className="file-meta">{editor.fileName} · {editor.width} × {editor.height} px</span>
          <div className="spacer" />
          <div className="b-group">
            <button type="button" className="fit-btn" onClick={() => inputRef.current?.click()}>
              {t('common.open')}
            </button>
            <div className="lang-seg" role="group" aria-label={t('common.format')}>
              <button type="button" aria-pressed={editor.format === 'png'} onClick={() => editor.setFormat('png')}>PNG</button>
              <button type="button" aria-pressed={editor.format === 'jpg'} onClick={() => editor.setFormat('jpg')}>JPG</button>
            </div>
            <button
              type="button"
              className="btn btn-primary save-btn"
              data-testid="photo-editor-save"
              disabled={busy}
              onClick={() => {
                void editor.save();
              }}
            >
              {t('common.save')}
            </button>
          </div>
        </div>

        <section className="e-canvas" aria-label={t('common.photo')}>
          <div ref={frameRef} className="editor-scroll checker" />
          {busy ? (
            <div className="status" role="status">
              <p>{editor.$model.save.loading ? t('common.saving') : t('common.opening')}</p>
            </div>
          ) : null}
          <div className="canvas-alerts">{alerts}</div>
        </section>

        <div className="e-status">
          <div className="zoom">
            <button type="button" className="icon-btn" aria-label={t('common.zoomOut')} onClick={() => editor.zoomBy(-25)}>−</button>
            <span className="zoom-read" role="status">
              {editor.zoom}%
            </span>
            <button type="button" className="icon-btn" aria-label={t('common.zoomIn')} onClick={() => editor.zoomBy(25)}>+</button>
          </div>
          <button type="button" className="fit-btn" onClick={() => editor.fit()}>{t('common.fit')}</button>
          {editor.dirty ? <span className="dirty mono">{t('editor.dirty')}</span> : null}
        </div>

        <aside className="e-panel">
          {editor.tool ? (
            <>
              <div className="e-panel-head">
                <h2>{t(`editor.tool.${editor.tool}`)}</h2>
              </div>
              <div className="e-panel-body">
                {toolPanel(editor, t, show)}
                <p className="hint">{t('page.editor.hint')}</p>
              </div>
              <div className="e-panel-foot">
                <button type="button" className="btn btn-ghost" onClick={() => editor.closeTool()}>{t('common.close')}</button>
                <button type="button" className="btn btn-primary" onClick={() => editor.apply()}>{t('common.apply')}</button>
              </div>
            </>
          ) : (
            <div className="e-panel-body">
              <p className="hint">{t('page.editor.idle')}</p>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
});

function toolPanel(editor: PhotoEditorService, t: TextFn, show: (value: string) => string) {
  return (
    <>
      {editor.tool === 'filters' ? <FilterGrid editor={editor} /> : null}
      {editor.tool === 'resize' ? resizePanel(editor, t, show) : null}
      {editor.tool === 'crop' ? cropPanel(editor, t, show) : null}
      {editor.tool === 'transform' ? transformPanel(editor, t) : null}
      {editor.tool === 'draw' ? drawPanel(editor, t) : null}
      {editor.tool === 'text' ? textPanel(editor, t) : null}
      {editor.tool === 'shapes' ? shapesPanel(editor, t) : null}
      {editor.tool === 'stickers' ? stickersPanel(editor, t) : null}
      {editor.tool === 'frame' ? framePanel(editor, t, show) : null}
      {editor.tool === 'corners' ? cornersPanel(editor, t, show) : null}
    </>
  );
}

const FilterGrid = observer(function FilterGrid({ editor }: { editor: PhotoEditorService }) {
  const t = useText();
  const [previews, setPreviews] = useState<Record<string, string>>({});
  useEffect(() => {
    const source = editor.sourceCanvas();
    if (!source) return undefined;
    setPreviews(filterPreviews(source));
    return undefined;
  }, [editor, editor.revision]);
  const items: Array<{ id: FilterId | ''; name: string }> = [
    { id: '', name: t('editor.filter.original') },
    ...FILTERS.map((filter) => ({ id: filter.id, name: t(`editor.filter.${filter.id}`) })),
  ];
  return (
    <div className="opt">
      <span className="opt-label">{t('common.filters')}</span>
      <div className="filter-grid" role="group" aria-label={t('common.filters')}>
        {items.map((item) => (
          <button
            key={item.id || 'original'}
            type="button"
            className="filter-cell"
            aria-pressed={editor.filter === item.id}
            onClick={() => {
              if (item.id) editor.chooseFilter(item.id);
              else editor.clearFilter();
            }}
          >
            <span className="f-img">{previews[item.id] ? <img src={previews[item.id]} alt="" /> : null}</span>
            <span className="f-name">{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

function resizePanel(editor: PhotoEditorService, t: TextFn, show: (value: string) => string) {
  return (
    <>
      <div className="field-row">
        <label className="field">
          {t('common.width')}
          <input
            type="number"
            min={1}
            value={editor.resizeWidthText}
            aria-label={t('common.width')}
            onChange={(event) => editor.setResizeWidth(event.target.value)}
          />
        </label>
        <label className="field">
          {t('common.height')}
          <input
            type="number"
            min={1}
            value={editor.resizeHeightText}
            aria-label={t('common.height')}
            onChange={(event) => editor.setResizeHeight(event.target.value)}
          />
        </label>
      </div>
      <CheckRow checked={editor.lockAspect} onChange={(locked) => editor.setLockAspect(locked)}>
        {t('common.maintainAspect')}
      </CheckRow>
      <p className="hint">{show(editor.resizeResult)}</p>
    </>
  );
}

function cropPanel(editor: PhotoEditorService, t: TextFn, show: (value: string) => string) {
  return (
    <>
      <div className="field-row">
        <label className="field">
          {t('common.width')}
          <input
            type="number"
            min={1}
            value={editor.cropWidthText}
            aria-label={t('common.cropWidth')}
            onChange={(event) => editor.setCropWidth(event.target.value)}
          />
        </label>
        <label className="field">
          {t('common.height')}
          <input
            type="number"
            min={1}
            value={editor.cropHeightText}
            aria-label={t('common.cropHeight')}
            onChange={(event) => editor.setCropHeight(event.target.value)}
          />
        </label>
      </div>
      <div className="field-row">
        <label className="field">
          X
          <input
            type="number"
            value={editor.cropXText}
            aria-label={t('common.cropX')}
            onChange={(event) => editor.setCropX(event.target.value)}
          />
        </label>
        <label className="field">
          Y
          <input
            type="number"
            value={editor.cropYText}
            aria-label={t('common.cropY')}
            onChange={(event) => editor.setCropY(event.target.value)}
          />
        </label>
      </div>
      <Seg label={t('common.cropRatio')} wrap>
        {CROP_RATIOS.map((ratio) => (
          <button
            key={ratio.label}
            type="button"
            onClick={() => editor.setCropRatio(ratio.width, ratio.height)}
          >
            {ratio.label}
          </button>
        ))}
      </Seg>
      <p className="hint">{show(editor.cropSummary)}</p>
    </>
  );
}

function transformPanel(editor: PhotoEditorService, t: TextFn) {
  return (
    <Seg label={t('common.transform')} wrap>
      <button type="button" onClick={() => editor.rotateLeft()}>{t('common.rotateLeft')}</button>
      <button type="button" onClick={() => editor.rotateRight()}>{t('common.rotateRight')}</button>
      <button type="button" onClick={() => editor.flipHorizontal()}>{t('common.flipH')}</button>
      <button type="button" onClick={() => editor.flipVertical()}>{t('common.flipV')}</button>
    </Seg>
  );
}

function drawPanel(editor: PhotoEditorService, t: TextFn) {
  return (
    <>
      <label className="field">
        {t('common.brushColor')}
        <input
          type="color"
          value={editor.brushColor}
          aria-label={t('common.brushColor')}
          onChange={(event) => editor.setBrushColor(event.target.value)}
        />
      </label>
      {swatches(editor.brushColor, (color) => editor.setBrushColor(color), t)}
      <SliderRow
        label={t('common.brushSize')}
        value={editor.brushSize}
        min={1}
        max={72}
        ariaLabel={t('common.brushSize')}
        onChange={(size) => editor.setBrushSize(size)}
      />
    </>
  );
}

function textPanel(editor: PhotoEditorService, t: TextFn) {
  return (
    <>
      <label className="field">
        {t('common.text')}
        <input
          type="text"
          value={editor.text}
          placeholder={t('common.placeholder')}
          aria-label={t('common.text')}
          onChange={(event) => editor.setText(event.target.value)}
        />
      </label>
      <label className="field">
        {t('common.color')}
        <input
          type="color"
          value={editor.textColor}
          aria-label={t('common.textColor')}
          onChange={(event) => editor.setTextColor(event.target.value)}
        />
      </label>
      {swatches(editor.textColor, (color) => editor.setTextColor(color), t)}
      <button type="button" className="btn btn-ghost" onClick={() => editor.addText()}>{t('common.addTextButton')}</button>
    </>
  );
}

function shapesPanel(editor: PhotoEditorService, t: TextFn) {
  return (
    <>
      <Seg label={t('common.shapes')}>
        <button type="button" onClick={() => editor.addShape('rectangle')}>{t('common.rectangle')}</button>
        <button type="button" onClick={() => editor.addShape('ellipse')}>{t('common.ellipse')}</button>
        <button type="button" onClick={() => editor.addShape('line')}>{t('common.line')}</button>
      </Seg>
      <label className="field">
        {t('common.color')}
        <input
          type="color"
          value={editor.shapeColor}
          aria-label={t('common.shapeColor')}
          onChange={(event) => editor.setShapeColor(event.target.value)}
        />
      </label>
    </>
  );
}

function stickersPanel(editor: PhotoEditorService, t: TextFn) {
  return (
    <Seg label={t('common.stickers')} wrap>
      {STICKERS.map((sticker) => (
        <button key={sticker.id} type="button" onClick={() => editor.addSticker(sticker.id)}>
          {t(`editor.sticker.${sticker.id}`)}
        </button>
      ))}
    </Seg>
  );
}

function framePanel(editor: PhotoEditorService, t: TextFn, show: (value: string) => string) {
  return (
    <>
      <SliderRow
        label={t('common.frameSize')}
        value={editor.frameSize}
        min={0}
        max={100}
        ariaLabel={t('common.frameSize')}
        onChange={(size) => editor.setFrameSize(size)}
      />
      <label className="field">
        {t('common.color')}
        <input
          type="color"
          value={editor.frameColor}
          aria-label={t('common.frameColor')}
          onChange={(event) => editor.setFrameColor(event.target.value)}
        />
      </label>
      <p className="hint">{show(editor.frameSummary)}</p>
    </>
  );
}

function cornersPanel(editor: PhotoEditorService, t: TextFn, show: (value: string) => string) {
  return (
    <>
      <SliderRow
        label={t('common.cornerRadius')}
        value={editor.cornerRadius}
        min={0}
        max={300}
        ariaLabel={t('common.cornerRadius')}
        onChange={(radius) => editor.setCornerRadius(radius)}
      />
      <p className="hint">{show(editor.cornerSummary)}</p>
    </>
  );
}

function swatches(selected: string, onPick: (color: string) => void, t: TextFn) {
  return (
    <div className="swatches" role="group" aria-label={t('common.swatches')}>
      {SWATCHES.map((color) => (
        <button
          key={color}
          type="button"
          className="swatch"
          style={{ background: color }}
          aria-label={color}
          aria-pressed={selected.toLowerCase() === color}
          onClick={() => onPick(color)}
        />
      ))}
    </div>
  );
}

export default bindServices(PhotoEditorPage, [PhotoEditorService]);
