import { bindServices, observer, useService } from '@rabjs/react';
import { useEffect } from 'react';
import ReactCrop from 'react-image-crop';
import { useDropzone } from 'react-dropzone';
import 'react-image-crop/dist/ReactCrop.css';
import { ToolWorkspace, listedErrors, queueRow } from '../../components/tool-workspace';
import { useText } from '../../i18n/use-text';
import { resultCaption } from '../caption';
import { CropService, type CropItem } from './crop.service';
import './crop.css';

function cropPixels(item: CropItem) {
  const known = item.sourceWidth > 0 && item.sourceHeight > 0;
  return {
    x: known ? Math.round((item.cropX / 100) * item.sourceWidth) : Math.round(item.cropX),
    y: known ? Math.round((item.cropY / 100) * item.sourceHeight) : Math.round(item.cropY),
    width: known ? Math.round((item.cropWidth / 100) * item.sourceWidth) : Math.round(item.cropWidth),
    height: known ? Math.round((item.cropHeight / 100) * item.sourceHeight) : Math.round(item.cropHeight),
  };
}

function writeCrop(tool: CropService, item: CropItem, key: 'x' | 'y' | 'width' | 'height', raw: string) {
  const next = Number(raw);
  if (!Number.isFinite(next)) return;
  const box = cropPixels(item);
  box[key] = next;
  const xScale = item.sourceWidth > 0 ? item.sourceWidth : 100;
  const yScale = item.sourceHeight > 0 ? item.sourceHeight : 100;
  tool.setCrop({
    x: (box.x / xScale) * 100,
    y: (box.y / yScale) * 100,
    width: (box.width / xScale) * 100,
    height: (box.height / yScale) * 100,
  });
}

const CropFrame = observer(() => {
  const tool = useService(CropService);
  const selected = tool.selected;
  if (!selected) return null;
  return (
    <div className="crop-frame">
      <ReactCrop
        crop={{
          unit: '%',
          x: selected.cropX,
          y: selected.cropY,
          width: selected.cropWidth,
          height: selected.cropHeight,
        }}
        keepSelection
        minWidth={1}
        minHeight={1}
        onChange={(_pixel, percent) => {
          tool.setCrop({
            x: percent.x,
            y: percent.y,
            width: percent.width,
            height: percent.height,
          });
        }}
      >
        <img
          src={selected.sourceUrl}
          alt={selected.name}
          draggable={false}
          onLoad={(event) => {
            tool.noteSize(selected.id, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight);
          }}
        />
      </ReactCrop>
    </div>
  );
});

const CropPage = observer(() => {
  const tool = useService(CropService);
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
      pageTestId="page-crop"
      inputTestId="crop-input"
      runTestId="crop-run"
      runLabel={t('page.crop.run')}
      runningLabel={t('page.crop.running')}
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
      emptyTitle={t('common.dropWhat', { what: t('drop.anImage') })}
      emptyCopy={t('page.crop.empty')}
      hero={selected ? <CropFrame /> : null}
      caption={selected ? resultCaption(selected) : ''}
      settings={selected ? (
        <CropFields
          box={cropPixels(selected)}
          onCommit={(key, raw) => writeCrop(tool, selected, key, raw)}
        />
      ) : <p className="hint">{t('page.crop.hint')}</p>}
      rows={tool.items.map((item) => queueRow(item, tool.selectedId))}
      onSelect={(id) => tool.select(id)}
      onDownloadOne={(id) => tool.downloadItem(id)}
      onDiscard={(id) => tool.discard(id)}
    />
  );
});

function CropFields({
  box,
  onCommit,
}: {
  box: { x: number; y: number; width: number; height: number };
  onCommit: (key: 'x' | 'y' | 'width' | 'height', raw: string) => void;
}) {
  const t = useText();
  return (
    <>
      <div className="field-row">
        <label className="field">
          {t('common.width')}
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={box.width}
            aria-label={t('common.cropWidth')}
            onChange={(event) => onCommit('width', event.target.value)}
          />
        </label>
        <label className="field">
          {t('common.height')}
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={box.height}
            aria-label={t('common.cropHeight')}
            onChange={(event) => onCommit('height', event.target.value)}
          />
        </label>
      </div>
      <div className="field-row">
        <label className="field">
          X
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={box.x}
            aria-label={t('common.cropX')}
            onChange={(event) => onCommit('x', event.target.value)}
          />
        </label>
        <label className="field">
          Y
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={box.y}
            aria-label={t('common.cropY')}
            onChange={(event) => onCommit('y', event.target.value)}
          />
        </label>
      </div>
      <p className="hint">{t('page.crop.hint')}</p>
    </>
  );
}

export default bindServices(CropPage, [CropService]);
