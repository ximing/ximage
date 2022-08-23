import { bindServices, observer, useService } from '@rabjs/react';
import { useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { BeforeAfter } from '../../components/compare-view';
import { Seg, ToolWorkspace, listedErrors, queueRow } from '../../components/tool-workspace';
import { phrase } from '../../i18n/phrase';
import { useText } from '../../i18n/use-text';
import { resultCaption } from '../caption';
import { MemeService } from './meme.service';
import './meme.css';

const MemePage = observer(() => {
  const tool = useService(MemeService);
  const t = useText();
  const drop = useDropzone({
    multiple: false,
    noClick: true,
    onDrop: (files) => {
      void tool.addFiles(files);
    },
    onDropRejected: (rejections) => {
      tool.addRejections(rejections.map((entry) => ({
        name: entry.file.name || 'Untitled',
        reason: phrase('reason.memeOne'),
      })));
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
      pageTestId="page-meme"
      inputTestId="meme-input"
      runTestId="meme-run"
      runLabel={t('page.meme.run')}
      runningLabel={t('page.meme.running')}
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
      canRun={tool.items.length === 1 && !tool.$model.addFiles.loading}
      doneCount={tool.doneCount}
      selectedReady={Boolean(selected && selected.status === 'done')}
      onDownloadSelected={() => tool.downloadSelected()}
      onDownloadAll={() => tool.downloadAll()}
      rejections={tool.rejections}
      errors={errors}
      notes={tool.items.map((item) => item.note).filter((note) => note.length > 0)}
      emptyTitle={t('common.dropWhat', { what: t('drop.anImage') })}
      emptyCopy={t('page.meme.empty')}
      hero={selected ? (
        selected.status === 'done' && selected.resultUrl ? (
          <BeforeAfter
            status={selected.status}
            sourceUrl={selected.sourceUrl}
            resultUrl={selected.resultUrl}
            name={selected.name}
            beforeLabel={t('common.original')}
            afterLabel={t('page.meme.after')}
          />
        ) : (
          <div className="fit">
            <div className={tool.placement === 'outside' ? 'meme-stage outside' : 'meme-stage'}>
              {tool.topText ? <span className="meme-line top">{tool.topText}</span> : null}
              <img src={selected.sourceUrl} alt={selected.name} />
              {tool.bottomText ? <span className="meme-line bottom">{tool.bottomText}</span> : null}
            </div>
          </div>
        )
      ) : null}
      caption={selected ? resultCaption(selected) : ''}
      settings={(
        <>
          <Seg label={t('common.captionPlacement')}>
            <button type="button" aria-pressed={tool.placement === 'inside'} onClick={() => tool.setPlacement('inside')}>
              {t('common.textInside')}
            </button>
            <button type="button" aria-pressed={tool.placement === 'outside'} onClick={() => tool.setPlacement('outside')}>
              {t('common.textOutside')}
            </button>
          </Seg>
          <label className="field">
            {t('common.top')}
            <input
              type="text"
              value={tool.topText}
              placeholder={t('common.placeholder')}
              aria-label={t('common.topCaption')}
              onChange={(event) => tool.setTopText(event.target.value)}
            />
          </label>
          <label className="field">
            {t('common.bottom')}
            <input
              type="text"
              value={tool.bottomText}
              placeholder={t('common.placeholder')}
              aria-label={t('common.bottomCaption')}
              onChange={(event) => tool.setBottomText(event.target.value)}
            />
          </label>
          <p className="hint">{t('page.meme.hint')}</p>
        </>
      )}
      rows={tool.items.map((item) => queueRow(item, tool.selectedId))}
      onSelect={(id) => tool.select(id)}
      onDownloadOne={(id) => tool.downloadItem(id)}
      onDiscard={(id) => tool.discard(id)}
    />
  );
});

export default bindServices(MemePage, [MemeService]);
