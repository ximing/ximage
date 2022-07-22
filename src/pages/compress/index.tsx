import { bindServices, observer, useService } from '@rabjs/react';
import { useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { BeforeAfter } from '../../components/compare-view';
import { SliderRow, ToolWorkspace, listedErrors, queueRow } from '../../components/tool-workspace';
import { useText } from '../../i18n/use-text';
import { resultCaption } from '../caption';
import { CompressService } from './compress.service';

const CompressPage = observer(() => {
  const tool = useService(CompressService);
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
      pageTestId="page-compress"
      inputTestId="compress-input"
      runTestId="compress-run"
      runLabel={t('page.compress.run')}
      runningLabel={t('page.compress.running')}
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
      emptyCopy={t('page.compress.empty')}
      hero={selected ? (
        <BeforeAfter
          status={selected.status}
          sourceUrl={selected.sourceUrl}
          resultUrl={selected.resultUrl}
          name={selected.name}
          beforeLabel={t('common.original')}
          afterLabel={t('page.compress.after')}
        />
      ) : null}
      caption={selected ? resultCaption(selected) : ''}
      settings={(
        <>
          <SliderRow
            label={t('common.quality')}
            value={tool.quality}
            min={1}
            max={100}
            ariaLabel={t('common.quality')}
            onChange={(value) => tool.setQuality(value)}
          />
          <p className="hint">{t('page.compress.hint')}</p>
        </>
      )}
      rows={tool.items.map((item) => queueRow(item, tool.selectedId))}
      onSelect={(id) => tool.select(id)}
      onDownloadOne={(id) => tool.downloadItem(id)}
      onDiscard={(id) => tool.discard(id)}
    />
  );
});

export default bindServices(CompressPage, [CompressService]);
