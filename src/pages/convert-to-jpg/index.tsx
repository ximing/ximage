import { bindServices, observer, useService } from '@rabjs/react';
import { useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { BeforeAfter } from '../../components/compare-view';
import { ToolWorkspace, listedErrors, queueRow } from '../../components/tool-workspace';
import { useText } from '../../i18n/use-text';
import { outputLabel } from '../../tools/convert/outputs';
import { resultCaption } from '../caption';
import { OutputFormats } from '../convert/output-formats';
import { ConvertToJpgService } from './convert-to-jpg.service';

const ConvertToJpgPage = observer(() => {
  const tool = useService(ConvertToJpgService);
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
      pageTestId="page-convert-to-jpg"
      inputTestId="convert-to-jpg-input"
      runTestId="convert-to-jpg-run"
      runLabel={t('page.toJpg.run')}
      runningLabel={t('page.toJpg.running')}
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
      emptyCopy={t('page.toJpg.empty')}
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
          <p className="hint">{t('page.toJpg.hint')}</p>
        </>
      )}
      rows={tool.items.map((item) => queueRow(item, tool.selectedId))}
      onSelect={(id) => tool.select(id)}
      onDownloadOne={(id) => tool.downloadItem(id)}
      onDiscard={(id) => tool.discard(id)}
    />
  );
});

export default bindServices(ConvertToJpgPage, [ConvertToJpgService]);
