import { bindServices, observer, useService } from '@rabjs/react';
import { ReactCompareSlider } from 'react-compare-slider';
import { useDropzone } from 'react-dropzone';
import { ThemeService } from '../../services/theme.service';
import { StudioService, type QueueItem } from './studio.service';

const Fit = observer(({ src, alt, checker }: { src: string; alt: string; checker: boolean }) => {
  return (
    <div className={checker ? 'fit checker' : 'fit'}>
      <img src={src} alt={alt} draggable={false} />
    </div>
  );
});

const StudioContent = observer(() => {
  const studio = useService(StudioService);
  const theme = useService(ThemeService);
  const drop = useDropzone({
    multiple: true,
    noClick: true,
    onDrop: (files) => studio.addFiles(files),
  });
  const selected = studio.selected;

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="mark">Ximage</span>
          <p>Background removal, on this device</p>
        </div>
        <button
          type="button"
          className="theme"
          data-testid="theme-toggle"
          aria-pressed={theme.theme === 'dark'}
          onClick={() => theme.toggle()}
        >
          {theme.theme === 'dark' ? 'Light theme' : 'Dark theme'}
        </button>
      </header>

      <main
        className={drop.isDragActive ? 'workspace is-drag' : 'workspace'}
        data-testid="workspace"
        {...drop.getRootProps()}
      >
        <input {...drop.getInputProps()} data-testid="file-input" />
        <section className="hero" aria-label="Selected image">
          {selected ? (
            <SelectedImage item={selected} />
          ) : (
            <div className="empty">
              <h1>
                Drop
                <br />
                <span>a photo</span>
              </h1>
              <p>JPG or PNG. The cutout runs in this browser, and the file is not uploaded.</p>
              <button type="button" className="primary" onClick={() => drop.open()}>
                Choose images
              </button>
            </div>
          )}
        </section>

        {studio.rejections.length > 0 ? (
          <ul className="rejections" role="alert" data-testid="rejection">
            {studio.rejections.map((rejection) => (
              <li key={rejection.name}>{rejection.name}: {rejection.reason}</li>
            ))}
          </ul>
        ) : null}

        {studio.bannerError ? (
          <p className="banner" role="alert" data-testid="model-error">{studio.bannerError}</p>
        ) : null}

        <footer className="dock">
          {studio.items.length > 0 ? (
            <div className="strip" aria-label="Images">
              {studio.items.map((item) => (
                <div key={item.id} className={item.id === studio.selectedId ? 'thumb is-selected' : 'thumb'}>
                  <button type="button" className="thumb-pick" onClick={() => studio.select(item.id)}>
                    <img src={item.resultUrl || item.sourceUrl} alt="" />
                    <span>{item.name}</span>
                  </button>
                  {item.status === 'done' ? (
                    <button type="button" onClick={() => studio.downloadOne(item.id)}>
                      Download
                    </button>
                  ) : null}
                  <button type="button" onClick={() => studio.discard(item.id)}>
                    Discard
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="actions">
            {studio.items.length > 0 ? (
              <button type="button" onClick={() => drop.open()}>
                Add images
              </button>
            ) : null}
            <button
              type="button"
              className="primary"
              data-testid="remove-background"
              disabled={studio.items.length === 0 || studio.$model.removeAll.loading}
              onClick={() => {
                void studio.removeAll();
              }}
            >
              {studio.$model.removeAll.loading ? 'Removing background' : 'Remove background'}
            </button>
            <button
              type="button"
              data-testid="download-selected"
              disabled={!selected || selected.status !== 'done'}
              onClick={() => selected && studio.downloadOne(selected.id)}
            >
              Download this image
            </button>
            {studio.doneCount >= 2 ? (
              <button type="button" data-testid="download-all" onClick={() => studio.downloadAll()}>
                Download all
              </button>
            ) : null}
          </div>
        </footer>
      </main>
    </div>
  );
});

const SelectedImage = observer(({ item }: { item: QueueItem }) => {
  const studio = useService(StudioService);
  const colors = [
    { id: 'transparent', label: 'Transparent', value: null },
    { id: 'white', label: 'White', value: '#ffffff' },
    { id: 'black', label: 'Black', value: '#000000' },
  ] as const;

  return (
    <div className="selected">
      <div className="frame">
        {item.resultUrl ? (
          <div className="compare" data-testid="compare">
            <ReactCompareSlider
              defaultPosition={50}
              itemOne={<Fit src={item.sourceUrl} alt="Original" checker={false} />}
              itemTwo={
                <Fit
                  src={item.resultUrl}
                  alt="Background removed"
                  checker={studio.background === null}
                />
              }
              handle={<span className="handle" />}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        ) : (
          <div className="fit">
            <img src={item.sourceUrl} alt={item.name} />
          </div>
        )}
        {item.status === 'running' || item.status === 'error' ? (
          <div className="status" data-testid="status" role="status">
            <p>{item.message}</p>
            {item.status === 'running' ? <progress value={item.progress} max={100} /> : null}
          </div>
        ) : null}
      </div>
      <div className="meta">
        <p className="caption">
          {item.width > 0
            ? `${item.width} × ${item.height} pixels, the same size as the original.`
            : item.name}
        </p>
        <div className="colors" aria-label="Export background">
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
          <label className="pick">
            Color
            <input
              type="color"
              value={studio.background && studio.background !== '#ffffff' && studio.background !== '#000000' ? studio.background : '#d6e4ff'}
              disabled={item.status !== 'done'}
              aria-label="Custom background color"
              onChange={(event) => {
                void studio.setBackground(event.target.value);
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
});

export default bindServices(StudioContent, [StudioService]);
