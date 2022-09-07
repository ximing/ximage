import { bindServices, observer, useService } from '@rabjs/react';
import { useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { BeforeAfter } from '../../components/compare-view';
import { Seg, ToolWorkspace, listedErrors, queueRow } from '../../components/tool-workspace';
import { usePhrase, useText } from '../../i18n/use-text';
import { upscaleDimensions } from '../../tools/upscale/scale';
import { resultCaption } from '../caption';
import { UpscaleService } from './upscale.service';
import './upscale.css';

const UpscalePage = observer(() => {
  const tool = useService(UpscaleService);
  const t = useText();
  const show = usePhrase();
  const drop = useDropzone({
    multiple: true,
    noClick: true,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    onDrop: (accepted, rejected) => {
      void tool.addFiles([...accepted, ...rejected.map((entry) => entry.file)]);
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
      pageTestId="page-upscale"
      inputTestId="upscale-input"
      runTestId="upscale-run"
      runLabel={t('page.upscale.run')}
      runningLabel={t('page.upscale.running')}
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
      emptyCopy={t('page.upscale.empty')}
      hero={selected ? (
        <BeforeAfter
          status={selected.status}
          sourceUrl={selected.sourceUrl}
          resultUrl={selected.resultUrl}
          name={selected.name}
          beforeLabel={t('common.original')}
          afterLabel={t('page.upscale.after')}
        />
      ) : null}
      caption={selected ? (selected.status === 'done' ? resultCaption(selected) : tool.previewLine) : ''}
      settings={(
        <>
          <Seg label={t('common.sizeMultiplier')}>
            <button type="button" aria-pressed={tool.factor === 2} onClick={() => tool.setFactor(2)}>2×</button>
            <button type="button" aria-pressed={tool.factor === 4} onClick={() => tool.setFactor(4)}>4×</button>
          </Seg>
          <SizeRead tool={tool} label={show(tool.previewLine)} />
          <p className="hint">{t('page.upscale.hint')}</p>
        </>
      )}
      rows={tool.items.map((item) => queueRow(item, tool.selectedId))}
      onSelect={(id) => tool.select(id)}
      onDownloadOne={(id) => tool.downloadItem(id)}
      onDiscard={(id) => tool.discard(id)}
    />
  );
});

function SizeRead({ tool, label }: { tool: UpscaleService; label: string }) {
  const selected = tool.selected;
  if (!selected || selected.sourceWidth < 1 || selected.sourceHeight < 1) {
    return <p className="hint">{label}</p>;
  }
  const target = upscaleDimensions(selected.sourceWidth, selected.sourceHeight, tool.factor);
  return (
    <div className="size-read" aria-label={label}>
      <span>{selected.sourceWidth}×{selected.sourceHeight}</span>
      <span className="arrow" aria-hidden="true">→</span>
      <span>{target.width}×{target.height}</span>
    </div>
  );
}

export default bindServices(UpscalePage, [UpscaleService]);
