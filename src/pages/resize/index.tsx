import { bindServices, observer, useService } from '@rabjs/react';
import { useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { BeforeAfter } from '../../components/compare-view';
import { CheckRow, Seg, ToolWorkspace, listedErrors, queueRow } from '../../components/tool-workspace';
import { useText } from '../../i18n/use-text';
import { resultCaption } from '../caption';
import { ResizeService } from './resize.service';

const ResizePage = observer(() => {
  const tool = useService(ResizeService);
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
      pageTestId="page-resize"
      inputTestId="resize-input"
      runTestId="resize-run"
      runLabel={t('page.resize.run')}
      runningLabel={t('page.resize.running')}
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
      canRun={tool.items.length > 0 && !tool.$model.addFiles.loading}
      doneCount={tool.doneCount}
      selectedReady={Boolean(selected && selected.status === 'done')}
      onDownloadSelected={() => tool.downloadSelected()}
      onDownloadAll={() => tool.downloadAll()}
      rejections={tool.rejections}
      errors={errors}
      notes={tool.items.map((item) => item.note).filter((note) => note.length > 0)}
      emptyTitle={t('common.dropWhat', { what: t('drop.images') })}
      emptyCopy={t('page.resize.empty')}
      hero={selected ? (
        <BeforeAfter
          status={selected.status}
          sourceUrl={selected.sourceUrl}
          resultUrl={selected.resultUrl}
          name={selected.name}
          beforeLabel={t('common.original')}
          afterLabel={t('page.resize.after')}
        />
      ) : null}
      caption={selected ? resultCaption(selected) : ''}
      settings={(
        <>
          <Seg label={t('common.resizeMode')}>
            <button type="button" aria-pressed={tool.mode === 'pixels'} onClick={() => tool.setMode('pixels')}>
              {t('common.pixels')}
            </button>
            <button type="button" aria-pressed={tool.mode === 'percent'} onClick={() => tool.setMode('percent')}>
              {t('common.percent')}
            </button>
          </Seg>
          {tool.mode === 'pixels' ? (
            <>
              <div className="field-row">
                <label className="field">
                  {t('common.width')}
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={tool.widthText}
                    aria-label={t('common.widthPx')}
                    onChange={(event) => tool.setWidthText(event.target.value)}
                  />
                </label>
                <label className="field">
                  {t('common.height')}
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={tool.heightText}
                    aria-label={t('common.heightPx')}
                    onChange={(event) => tool.setHeightText(event.target.value)}
                  />
                </label>
              </div>
              <CheckRow checked={tool.lockAspect} onChange={(checked) => tool.setLockAspect(checked)}>
                {t('common.lockAspect')}
              </CheckRow>
            </>
          ) : (
            <label className="field">
              {t('common.percent')}
              <input
                type="number"
                min={1}
                inputMode="decimal"
                value={tool.percentText}
                aria-label={t('common.scalePercent')}
                onChange={(event) => tool.setPercentText(event.target.value)}
              />
            </label>
          )}
          <p className="hint">{t('page.resize.hint')}</p>
        </>
      )}
      rows={tool.items.map((item) => queueRow(item, tool.selectedId))}
      onSelect={(id) => tool.select(id)}
      onDownloadOne={(id) => tool.downloadItem(id)}
      onDiscard={(id) => tool.discard(id)}
    />
  );
});

export default bindServices(ResizePage, [ResizeService]);
