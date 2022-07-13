import { bindServices, observer, useService } from '@rabjs/react';
import { useDropzone } from 'react-dropzone';
import { CompareView } from '../../components/compare-view';
import { IconCheck, IconDownload, IconLock, IconPlus, IconUpload, IconX } from '../../components/icons';
import '../../components/tool-workspace.css';
import { usePhrase, useText } from '../../i18n/use-text';
import { StudioService, type QueueItem } from './studio.service';
import './studio.css';

const StudioContent = observer(() => {
  const studio = useService(StudioService);
  const t = useText();
  const show = usePhrase();
  const drop = useDropzone({
    multiple: true,
    noClick: true,
    onDrop: (files) => studio.addFiles(files),
  });
  const selected = studio.selected;
  const idle = studio.items.length === 0;

  return (
    <div className="page" data-testid="page-remove-background">
      <main
        className={
          idle
            ? (drop.isDragActive ? 'bench bench-idle is-drag' : 'bench bench-idle')
            : (drop.isDragActive ? 'bench is-drag' : 'bench')
        }
        data-testid="workspace"
        {...drop.getRootProps()}
      >
        <input {...drop.getInputProps()} data-testid="file-input" />
        <section className="hero" aria-label={t('common.selectedImage')}>
          {selected ? (
            <SelectedImage item={selected} />
          ) : (
            <div className="drop">
              <div className="drop-ic"><IconUpload /></div>
              <h1>{t('common.dropWhat', { what: t('drop.aPhoto') })}</h1>
              <p className="drop-or">{t('common.or')}</p>
              <button type="button" className="btn btn-primary" onClick={() => drop.open()}>
                {t('common.choose')}
              </button>
              <p className="drop-copy">{t('page.studio.empty')}</p>
            </div>
          )}
        </section>

        {!idle ? (
          <aside className="rail">
            <div className="rail-scroll">
              <div className="rail-head">
                <h2>{t('tools.remove-background.title')}</h2>
                <p className="rail-sub">{t('common.queueCount', { count: studio.items.length })}</p>
              </div>
              {studio.rejections.length > 0 ? (
                <ul className="rejections" role="alert" data-testid="rejection">
                  {studio.rejections.map((rejection) => (
                    <li key={rejection.name}>{rejection.name}: {show(rejection.reason)}</li>
                  ))}
                </ul>
              ) : null}
              {studio.bannerError ? (
                <p className="banner" role="alert" data-testid="model-error">{show(studio.bannerError)}</p>
              ) : null}
              {selected ? <BackgroundPicker item={selected} /> : null}
            </div>
            <footer className="rail-foot">
              <button
                type="button"
                className="btn btn-primary btn-block"
                data-testid="remove-background"
                disabled={studio.items.length === 0 || studio.$model.removeAll.loading}
                onClick={() => {
                  void studio.removeAll();
                }}
              >
                {studio.$model.removeAll.loading ? t('common.removing') : t('common.remove')}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-block"
                data-testid="download-selected"
                disabled={!selected || selected.status !== 'done'}
                onClick={() => selected && studio.downloadOne(selected.id)}
              >
                {t('common.downloadThis')}
              </button>
              {studio.doneCount >= 2 ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-block"
                  data-testid="download-all"
                  onClick={() => studio.downloadAll()}
                >
                  {t('common.downloadAll')}
                </button>
              ) : null}
              <span className="privacy"><IconLock />{t('common.localOnly')}</span>
            </footer>
          </aside>
        ) : null}

        {studio.items.length > 0 ? (
          <div className="strip" aria-label={t('common.images')}>
            {studio.items.map((item) => (
              <div key={item.id} className={item.id === studio.selectedId ? 'thumb on' : 'thumb'}>
                <button type="button" className="thumb-pick" onClick={() => studio.select(item.id)}>
                  <img src={item.resultUrl || item.sourceUrl} alt="" />
                  <span className="t-meta">
                    <span className="t-name">{item.name}</span>
                    <span className="t-sub">
                      {item.status === 'done' && item.width > 0
                        ? `${item.width}×${item.height}`
                        : show(item.message)}
                    </span>
                  </span>
                </button>
                {item.status === 'done' ? <span className="t-state done"><IconCheck /></span> : null}
                {item.status === 'error' ? <span className="t-state err"><IconX /></span> : null}
                {item.status === 'running' ? (
                  <span className="t-prog"><i style={{ width: `${Math.max(0, Math.min(100, item.progress))}%` }} /></span>
                ) : null}
                <div className="thumb-acts">
                  {item.status === 'done' ? (
                    <button type="button" aria-label={t('common.download')} onClick={() => studio.downloadOne(item.id)}>
                      <IconDownload />
                    </button>
                  ) : null}
                  <button type="button" aria-label={t('common.discard')} onClick={() => studio.discard(item.id)}>
                    <IconX />
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="thumb-add" onClick={() => drop.open()}>
              <IconPlus />
              {t('common.add')}
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
});

const SelectedImage = observer(({ item }: { item: QueueItem }) => {
  const studio = useService(StudioService);
  const t = useText();
  const show = usePhrase();

  return (
    <>
      {item.resultUrl ? (
        <CompareView
          testId="compare"
          before={item.sourceUrl}
          after={item.resultUrl}
          beforeLabel={t('common.original')}
          afterLabel={t('common.backgroundRemoved')}
          alt={item.name}
          checker={studio.background === null}
        />
      ) : (
        <div className="fit">
          <img src={item.sourceUrl} alt={item.name} />
        </div>
      )}
      {item.status === 'running' || item.status === 'error' ? (
        <div className="status" data-testid="status" role="status">
          <p>{show(item.message)}</p>
          {item.status === 'running' ? <progress value={item.progress} max={100} /> : null}
        </div>
      ) : (
        <div className="result-chip">
          <span className="mono name">{item.name}</span>
          {item.width > 0 ? (
            <>
              <span className="sep" />
              <span className="mono">{item.width} × {item.height}</span>
            </>
          ) : null}
        </div>
      )}
    </>
  );
});

const BackgroundPicker = observer(({ item }: { item: QueueItem }) => {
  const studio = useService(StudioService);
  const t = useText();
  const colors = [
    { id: 'transparent', label: t('common.transparent'), value: null },
    { id: 'white', label: t('common.white'), value: '#ffffff' },
    { id: 'black', label: t('common.black'), value: '#000000' },
  ] as const;

  return (
    <div className="settings">
      <div className="opt">
        <span className="opt-label">{t('common.exportBackground')}</span>
        <div className="seg" role="group" aria-label={t('common.exportBackground')}>
          {colors.map((color) => (
            <button
              key={color.id}
              type="button"
              aria-pressed={studio.background === color.value}
              disabled={item.status !== 'done'}
              onClick={() => {
                void studio.setBackground(color.value);
              }}
            >
              {color.label}
            </button>
          ))}
        </div>
        <label className="pick">
          {t('common.color')}
          <input
            type="color"
            value={studio.background && studio.background !== '#ffffff' && studio.background !== '#000000' ? studio.background : '#d6e4ff'}
            disabled={item.status !== 'done'}
            aria-label={t('common.customColor')}
            onChange={(event) => {
              void studio.setBackground(event.target.value);
            }}
          />
        </label>
      </div>
    </div>
  );
});

export default bindServices(StudioContent, [StudioService]);
