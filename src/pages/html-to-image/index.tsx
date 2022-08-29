import { bindServices, observer, useService } from '@rabjs/react';
import { useEffect } from 'react';
import { IconCode, IconLock } from '../../components/icons';
import { CheckRow, Seg, listedErrors } from '../../components/tool-workspace';
import { usePhrase, useText } from '../../i18n/use-text';
import { SCREEN_SIZES } from '../../tools/html-to-image/screen';
import { HtmlToImageService } from './html-to-image.service';
import './html-to-image.css';

const HtmlToImagePage = observer(() => {
  const tool = useService(HtmlToImageService);
  const t = useText();
  const show = usePhrase();
  useEffect(() => () => tool.release(), [tool]);
  const errors = listedErrors(tool.bannerError, tool.$model.convert.error?.message);
  const busy = tool.$model.convert.loading;

  return (
    <div className="page" data-testid="page-html-to-image">
      <main className="bench" aria-busy={busy}>
        <section className="hero" aria-label={t('common.htmlRender')}>
          {tool.resultUrl ? (
            <div className="html-preview">
              <img src={tool.resultUrl} alt={t('common.convertedHtml')} />
            </div>
          ) : (
            <div className="drop">
              <div className="drop-ic"><IconCode /></div>
              <h1>{t('tools.html-to-image.title')}</h1>
              <p className="drop-copy">{t('page.html.empty')}</p>
            </div>
          )}
          {busy ? (
            <div className="status html-busy" role="status">
              <p>{show(tool.busyMessage) || t('common.converting')}</p>
              <progress value={Number.isFinite(tool.busyProgress) ? tool.busyProgress : 0} max={100} />
            </div>
          ) : null}
          {!busy && tool.resultUrl ? (
            <div className="result-chip">
              <span className="mono">HTML</span>
              <span className="sep" />
              <span className="mono">
                {t('caption.htmlSize', {
                  width: tool.resultWidth,
                  height: tool.resultHeight,
                  format: tool.format === 'jpg' ? 'JPG' : 'SVG',
                })}
              </span>
            </div>
          ) : null}
        </section>

        <aside className="rail">
          <div className="rail-scroll">
            {errors.map((error) => (
              <p key={error} className="banner" role="alert">{show(error)}</p>
            ))}
            {tool.note ? <p className="note">{show(tool.note)}</p> : null}
            <div className="settings html-fields">
              <p className="hint">{t('page.html.proxy')}</p>
              <label className="field">
                {t('common.websiteUrl')}
                <input
                  type="url"
                  inputMode="url"
                  placeholder="https://example.com"
                  aria-label={t('common.websiteUrl')}
                  value={tool.url}
                  onChange={(event) => tool.setUrl(event.target.value)}
                />
              </label>
              <label className="field">
                {t('common.html')}
                <textarea
                  aria-label={t('common.html')}
                  rows={8}
                  placeholder={t('page.html.placeholder')}
                  value={tool.html}
                  onChange={(event) => tool.setHtml(event.target.value)}
                />
              </label>
              <p className="hint">{t('page.html.pasteHint')}</p>
              <Seg label={t('common.screenSize')} column>
                <button
                  type="button"
                  aria-pressed={tool.screenId === 'your-screen'}
                  onClick={() => tool.setScreen('your-screen')}
                >
                  {t('common.yourScreen', { px: tool.screenPixels })}
                </button>
                {SCREEN_SIZES.map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    aria-pressed={tool.screenId === size.id}
                    onClick={() => tool.setScreen(size.id)}
                  >
                    {t(`screen.${size.id}`)}
                  </button>
                ))}
              </Seg>
              <Seg label={t('common.convertTo')}>
                <button type="button" aria-pressed={tool.format === 'jpg'} onClick={() => tool.setFormat('jpg')}>JPG</button>
                <button type="button" aria-pressed={tool.format === 'svg'} onClick={() => tool.setFormat('svg')}>SVG</button>
              </Seg>
              <CheckRow checked={tool.blockAds} onChange={(checked) => tool.setBlockAds(checked)}>
                {t('common.blockAds')}
              </CheckRow>
              <CheckRow checked={tool.removeOverlays} onChange={(checked) => tool.setRemoveOverlays(checked)}>
                {t('common.removeOverlays')}
              </CheckRow>
              <p className="hint">{t('page.html.widthHint', { width: tool.frameWidth })}</p>
            </div>
          </div>
          <footer className="rail-foot">
            <button
              type="button"
              className="btn btn-primary btn-block"
              data-testid="html-to-image-run"
              disabled={!tool.canConvert || busy}
              onClick={() => {
                void tool.convert();
              }}
            >
              {busy ? t('common.converting') : t('common.convertHtml')}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-block"
              disabled={!tool.resultUrl}
              onClick={() => tool.download()}
            >
              {t('common.download')}
            </button>
            <span className="privacy"><IconLock />{t('common.localOnly')}</span>
          </footer>
        </aside>
      </main>
    </div>
  );
});

export default bindServices(HtmlToImagePage, [HtmlToImageService]);
