import { bindServices, observer, useService } from '@rabjs/react';
import { useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Seg, ToolWorkspace, listedErrors, queueRow } from '../../components/tool-workspace';
import { usePhrase, useText } from '../../i18n/use-text';
import { DETECTION_LEVELS } from '../../tools/blur-face/level';
import { resultCaption } from '../caption';
import { BlurFaceService } from './blur-face.service';
import './blur-face.css';

function boxStyle(
  area: { x: number; y: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number,
) {
  if (imageWidth < 1 || imageHeight < 1) return { display: 'none' };
  return {
    left: `${(area.x / imageWidth) * 100}%`,
    top: `${(area.y / imageHeight) * 100}%`,
    width: `${(area.width / imageWidth) * 100}%`,
    height: `${(area.height / imageHeight) * 100}%`,
  };
}

const BlurFacePage = observer(() => {
  const tool = useService(BlurFaceService);
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
  const areas = selected ? (tool.areas[selected.id] ?? []) : [];

  return (
    <ToolWorkspace
      pageTestId="page-blur-face"
      inputTestId="blur-face-input"
      runTestId="blur-face-run"
      runLabel={t('page.blur.run')}
      runningLabel={t('page.blur.running')}
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
      emptyTitle={t('common.dropWhat', { what: t('drop.photos') })}
      emptyCopy={t('page.blur.empty')}
      hero={selected ? (
        <div className="blur-frame">
          <div
            className={tool.addingArea ? 'blur-stage is-drawing' : 'blur-stage'}
            onPointerDown={(event) => {
              event.preventDefault();
              tool.beginArea(event.currentTarget, event.clientX, event.clientY, event.pointerId);
            }}
            onPointerMove={(event) => tool.moveArea(event.currentTarget, event.clientX, event.clientY)}
            onPointerUp={() => tool.endArea()}
            onPointerCancel={() => tool.endArea()}
          >
            <img
              src={selected.resultUrl || selected.sourceUrl}
              alt={selected.name}
              draggable={false}
              onLoad={(event) => {
                tool.noteSize(selected.id, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight);
              }}
            />
            {areas.map((area, index) => (
              <div key={`${area.x}-${area.y}-${area.width}-${index}`} className="blur-box" style={boxStyle(area, selected.sourceWidth, selected.sourceHeight)} />
            ))}
            {tool.draft ? (
              <div className="blur-box is-draft" style={boxStyle(tool.draft, selected.sourceWidth, selected.sourceHeight)} />
            ) : null}
          </div>
        </div>
      ) : null}
      caption={selected ? resultCaption(selected) : ''}
      settings={(
        <>
          <Seg label={t('common.automaticDetection')} column>
            {DETECTION_LEVELS.map((level) => (
              <button
                key={level.id}
                type="button"
                aria-pressed={tool.level === level.id}
                onClick={() => tool.setLevel(level.id)}
              >
                {t(`level.${level.id}`)}
                <small>{t(`level.${level.id}Note`)}</small>
              </button>
            ))}
          </Seg>
          <button
            type="button"
            className="add-area"
            aria-pressed={tool.addingArea}
            onClick={() => tool.toggleAdding()}
          >
            {t('common.addBlurArea')}
          </button>
          {selected ? areas.map((area, index) => (
            <button
              key={`${selected.id}-${index}`}
              type="button"
              className="area-remove"
              onClick={() => tool.removeArea(selected.id, index)}
            >
              {t('common.removeArea', {
                index: index + 1,
                width: Math.round(area.width),
                height: Math.round(area.height),
              })}
            </button>
          )) : null}
          <p className="hint">{show(tool.confidenceLabel)}</p>
          <p className="hint">{t('page.blur.hint')}</p>
          {tool.addingArea ? <p className="hint">{t('page.blur.drawHint')}</p> : null}
        </>
      )}
      rows={tool.items.map((item) => queueRow(item, tool.selectedId))}
      onSelect={(id) => tool.select(id)}
      onDownloadOne={(id) => tool.downloadItem(id)}
      onDiscard={(id) => tool.discard(id)}
    />
  );
});

export default bindServices(BlurFacePage, [BlurFaceService]);
