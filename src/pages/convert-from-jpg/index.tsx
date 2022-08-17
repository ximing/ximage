import { bindServices, observer, useService } from '@rabjs/react';
import { useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { BeforeAfter } from '../../components/compare-view';
import { CheckRow, Seg, ToolWorkspace, listedErrors, queueRow } from '../../components/tool-workspace';
import { useText } from '../../i18n/use-text';
import { outputLabel } from '../../tools/convert/outputs';
import { resultCaption } from '../caption';
import { OutputFormats } from '../convert/output-formats';
import { ConvertFromJpgService } from './convert-from-jpg.service';

const ConvertFromJpgPage = observer(() => {
  const tool = useService(ConvertFromJpgService);
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
  const animated = tool.format === 'gif' && tool.gifMotion === 'animated' && tool.animatedReady;

  return (
    <ToolWorkspace
      pageTestId="page-convert-from-jpg"
      inputTestId="convert-from-jpg-input"
      runTestId="convert-from-jpg-run"
      runLabel={t('page.fromJpg.run')}
      runningLabel={t('page.fromJpg.running')}
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
      canRun={tool.items.length > 0 && !tool.$model.addFiles.loading && !(tool.format === 'gif' && tool.gifMotion === 'animated' && !tool.animatedReady)}
      doneCount={tool.doneCount}
      selectedReady={Boolean(selected && selected.status === 'done')}
      onDownloadSelected={() => tool.downloadSelected()}
      onDownloadAll={() => tool.downloadAll()}
      rejections={tool.rejections}
      errors={errors}
      notes={tool.items.map((item) => item.note).filter((note) => note.length > 0)}
      emptyTitle={t('common.dropWhat', { what: t('drop.images') })}
      emptyCopy={t('page.fromJpg.empty')}
      hero={selected ? (
        <BeforeAfter
          status={selected.status}
          sourceUrl={selected.sourceUrl}
          resultUrl={selected.resultUrl}
          name={selected.name}
          beforeLabel={t('common.original')}
          afterLabel={outputLabel(tool.format)}
        />
      ) : null}
      caption={selected ? resultCaption(selected) : ''}
      settings={(
        <>
          <OutputFormats value={tool.format} onChange={(format) => tool.setFormat(format)} />
          {tool.format === 'gif' ? (
            <>
              <Seg label={t('common.gifMode')} column>
                <button type="button" aria-pressed={tool.gifMotion === 'static'} onClick={() => tool.setGifMotion('static')}>
                  {t('common.staticGif')}
                </button>
                <button
                  type="button"
                  aria-pressed={tool.gifMotion === 'animated'}
                  disabled={!tool.animatedReady}
                  onClick={() => tool.setGifMotion('animated')}
                >
                  {t('common.animatedGif')}
                </button>
              </Seg>
              {tool.animatedReady ? null : <p className="hint">{t('error.gifRequired')}</p>}
              {animated ? (
                <>
                  <label className="field">
                    {t('common.seconds')}
                    <input
                      type="number"
                      min={0.1}
                      step={0.1}
                      value={tool.secondsText}
                      aria-label={t('common.seconds')}
                      onChange={(event) => tool.setSecondsText(event.target.value)}
                    />
                  </label>
                  <CheckRow checked={tool.loop} onChange={(checked) => tool.setLoop(checked)}>
                    {t('common.loop')}
                  </CheckRow>
                </>
              ) : null}
            </>
          ) : (
            <p className="hint">{t('page.fromJpg.stillHint')}</p>
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

export default bindServices(ConvertFromJpgPage, [ConvertFromJpgService]);
