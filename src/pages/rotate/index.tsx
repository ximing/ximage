import { bindServices, observer, useService } from '@rabjs/react';
import { useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { BeforeAfter } from '../../components/compare-view';
import { IconRotateHalf, IconRotateLeft, IconRotateRight } from '../../components/icons';
import { Seg, ToolWorkspace, listedErrors, queueRow } from '../../components/tool-workspace';
import { useText } from '../../i18n/use-text';
import { quarterTurns } from '../../tools/rotate/geometry';
import { resultCaption } from '../caption';
import { RotateService } from './rotate.service';
import './rotate.css';

function activeQuarter(text: string): 0 | 1 | 2 | 3 | null {
  const value = Number(text);
  if (!Number.isFinite(value)) return null;
  return quarterTurns(value);
}

const RotatePage = observer(() => {
  const tool = useService(RotateService);
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
  const quarter = activeQuarter(tool.degreesText);
  const skipped = selected && selected.status === 'skipped' ? selected.message : '';
  const notice = skipped || (selected && selected.status === 'error' && !errors.includes(selected.message) ? selected.message : '');

  return (
    <ToolWorkspace
      pageTestId="page-rotate"
      inputTestId="rotate-input"
      runTestId="rotate-run"
      runLabel={t('page.rotate.run')}
      runningLabel={t('page.rotate.running')}
      busy={tool.$model.run.loading}
      busyMessage={tool.busyMessage}
      busyProgress={tool.busyProgress}
      notice={notice}
      noticeRole={selected && selected.status === 'error' ? 'alert' : 'status'}
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
      emptyCopy={t('page.rotate.empty')}
      hero={selected ? (
        <BeforeAfter
          status={selected.status}
          sourceUrl={selected.sourceUrl}
          resultUrl={selected.resultUrl}
          name={selected.name}
          beforeLabel={t('common.original')}
          afterLabel={t('page.rotate.after')}
        />
      ) : null}
      caption={selected ? resultCaption(selected) : ''}
      settings={(
        <>
          <div className="opt">
            <span className="opt-label">{t('common.angle')}</span>
            <div className="turn-row" role="group" aria-label={t('common.angle')}>
              <button type="button" className="turn-btn" aria-pressed={quarter === 3} onClick={() => tool.setDegrees(270)}>
                <span className="turn-glyph" aria-hidden="true"><IconRotateLeft /></span>
                {t('common.rotateLeft')}
                <small>270°</small>
              </button>
              <button type="button" className="turn-btn" aria-pressed={quarter === 2} onClick={() => tool.setDegrees(180)}>
                <span className="turn-glyph" aria-hidden="true"><IconRotateHalf /></span>
                180°
              </button>
              <button type="button" className="turn-btn" aria-pressed={quarter === 1} onClick={() => tool.setDegrees(90)}>
                <span className="turn-glyph" aria-hidden="true"><IconRotateRight /></span>
                {t('common.rotateRight')}
                <small>90°</small>
              </button>
            </div>
            <p className="angle-read">
              <input
                type="number"
                inputMode="decimal"
                value={tool.degreesText}
                aria-label={t('common.degrees')}
                onChange={(event) => tool.setDegreesText(event.target.value)}
              />
              <span>°</span>
            </p>
          </div>
          <Seg label={t('common.whichImages')}>
            <button type="button" aria-pressed={tool.filter === 'all'} onClick={() => tool.setFilter('all')}>
              {t('common.all')}
            </button>
            <button type="button" aria-pressed={tool.filter === 'landscape'} onClick={() => tool.setFilter('landscape')}>
              {t('common.landscape')}
            </button>
            <button type="button" aria-pressed={tool.filter === 'portrait'} onClick={() => tool.setFilter('portrait')}>
              {t('common.portrait')}
            </button>
          </Seg>
          <p className="hint">{t('page.rotate.hint')}</p>
        </>
      )}
      rows={tool.items.map((item) => queueRow(item, tool.selectedId))}
      onSelect={(id) => tool.select(id)}
      onDownloadOne={(id) => tool.downloadItem(id)}
      onDiscard={(id) => tool.discard(id)}
    />
  );
});

export default bindServices(RotatePage, [RotateService]);
