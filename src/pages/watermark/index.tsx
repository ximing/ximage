import { bindServices, observer, useService } from '@rabjs/react';
import { useEffect, type CSSProperties } from 'react';
import { useDropzone } from 'react-dropzone';
import { BeforeAfter } from '../../components/compare-view';
import { Seg, SliderRow, ToolWorkspace, listedErrors, queueRow } from '../../components/tool-workspace';
import {
  WATERMARK_FONTS,
  WATERMARK_POSITIONS,
  type WatermarkPosition,
} from '../../tools/watermark/anchor';
import { useText } from '../../i18n/use-text';
import { resultCaption } from '../caption';
import { WatermarkService } from './watermark.service';
import './watermark.css';

const MARK_PLACE: Record<WatermarkPosition, CSSProperties> = {
  'top-left': { top: '4%', left: '4%' },
  'top-center': { top: '4%', left: '50%', transform: 'translateX(-50%)' },
  'top-right': { top: '4%', right: '4%' },
  center: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
  'bottom-left': { bottom: '4%', left: '4%' },
  'bottom-center': { bottom: '4%', left: '50%', transform: 'translateX(-50%)' },
  'bottom-right': { bottom: '4%', right: '4%' },
};

const WatermarkPage = observer(() => {
  const tool = useService(WatermarkService);
  const t = useText();
  const drop = useDropzone({
    multiple: true,
    noClick: true,
    onDrop: (files) => {
      void tool.addFiles(files);
    },
  });
  useEffect(() => () => tool.release(), [tool]);
  const selected = tool.selected;
  const errors = listedErrors(
    tool.bannerError,
    tool.$model.run.error?.message,
    tool.$model.addFiles.error?.message,
  );
  const notice = selected && selected.status === 'error' && !errors.includes(selected.message)
    ? selected.message
    : '';

  return (
    <ToolWorkspace
      pageTestId="page-watermark"
      inputTestId="watermark-input"
      runTestId="watermark-run"
      runLabel={t('page.watermark.run')}
      runningLabel={t('page.watermark.running')}
      busy={tool.$model.run.loading}
      busyMessage={tool.busyMessage}
      busyProgress={tool.busyProgress}
      notice={notice}
      noticeRole="alert"
      rootProps={drop.getRootProps({ className: drop.isDragActive ? 'workspace is-drag' : 'workspace' })}
      inputProps={drop.getInputProps()}
      onOpen={() => drop.open()}
      onRun={() => {
        void tool.run();
      }}
      canRun={tool.items.length > 0 && tool.hasMark && !tool.$model.addFiles.loading}
      doneCount={tool.doneCount}
      selectedReady={Boolean(selected && selected.status === 'done')}
      onDownloadSelected={() => tool.downloadSelected()}
      onDownloadAll={() => tool.downloadAll()}
      rejections={tool.rejections}
      errors={errors}
      notes={tool.items.map((item) => item.note).filter((note) => note.length > 0)}
      emptyTitle={t('common.dropWhat', { what: t('drop.images') })}
      emptyCopy={t('page.watermark.empty')}
      hero={selected ? (
        selected.status === 'done' && selected.resultUrl ? (
          <BeforeAfter
            status={selected.status}
            sourceUrl={selected.sourceUrl}
            resultUrl={selected.resultUrl}
            name={selected.name}
            beforeLabel={t('common.original')}
            afterLabel={t('page.watermark.after')}
          />
        ) : (
          <div className="fit">
            <div className="mark-stage">
              <img src={selected.sourceUrl} alt={selected.name} />
              {tool.showText && tool.text ? (
                <span
                  className="mark-box"
                  style={{
                    ...MARK_PLACE[tool.position],
                    fontFamily: tool.font,
                    fontSize: markSize(tool.fontSizeText, selected.sourceWidth),
                    opacity: tool.opacity / 100,
                  }}
                >
                  {tool.text}
                </span>
              ) : null}
            </div>
          </div>
        )
      ) : null}
      caption={selected ? resultCaption(selected) : ''}
      settings={(
        <>
          <div className="mark-actions">
            <button type="button" aria-pressed={tool.showText} onClick={() => tool.addText()}>{t('common.addText')}</button>
            <label className="file-button">
              {t('common.addImage')}
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.gif,image/jpeg,image/png,image/gif"
                aria-label={t('common.watermarkImage')}
                onChange={(event) => {
                  tool.setMark(event.currentTarget.files);
                  event.currentTarget.value = '';
                }}
              />
            </label>
          </div>
          {tool.showText ? (
            <>
              <label className="field">
                {t('common.text')}
                <input
                  type="text"
                  value={tool.text}
                  placeholder={t('common.placeholder')}
                  aria-label={t('common.watermarkText')}
                  onChange={(event) => tool.setText(event.target.value)}
                />
              </label>
              <label className="field">
                {t('common.font')}
                <select className="select" aria-label={t('common.font')} value={tool.font} onChange={(event) => tool.setFont(event.target.value)}>
                  {WATERMARK_FONTS.map((font) => (
                    <option key={font} value={font}>{font}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                {t('common.fontSize')}
                <input
                  type="number"
                  min={1}
                  max={400}
                  value={tool.fontSizeText}
                  aria-label={t('common.fontSize')}
                  onChange={(event) => tool.setFontSizeText(event.target.value)}
                />
              </label>
            </>
          ) : null}
          <SliderRow
            label={t('common.opacity')}
            value={tool.opacity}
            min={0}
            max={100}
            ariaLabel={t('common.opacity')}
            onChange={(value) => tool.setOpacity(value)}
          />
          <Seg label={t('common.position')} className="pos-grid">
            {WATERMARK_POSITIONS.map((position) => (
              <button
                key={position}
                type="button"
                data-pos={position}
                aria-pressed={tool.position === position}
                onClick={() => tool.setPosition(position)}
              >
                {t(`position.${position}`)}
              </button>
            ))}
          </Seg>
          {tool.markName ? (
            <p className="hint">
              {tool.markName}
              {' '}
              <button type="button" onClick={() => tool.clearMark()}>{t('common.removeImage')}</button>
            </p>
          ) : (
            <p className="hint">{t('page.watermark.hint')}</p>
          )}
        </>
      )}
      rows={tool.items.map((item) => queueRow(item, tool.selectedId))}
      onSelect={(id) => tool.select(id)}
      onDownloadOne={(id) => tool.downloadItem(id)}
      onDiscard={(id) => tool.discard(id)}
    />
  );
});

function markSize(text: string, sourceWidth: number): string {
  const size = Number(text);
  if (!(sourceWidth > 0) || !Number.isFinite(size) || size <= 0) return '24px';
  const shown = Math.min(sourceWidth, 720);
  return `${(size / sourceWidth) * shown}px`;
}

export default bindServices(WatermarkPage, [WatermarkService]);
