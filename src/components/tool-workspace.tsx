import { observer } from '@rabjs/react';
import type { ReactNode } from 'react';
import type { DropzoneInputProps, DropzoneRootProps } from 'react-dropzone';
import { formatBytes } from '../domain/bytes';
import { usePhrase, useText } from '../i18n/use-text';
import { IconCheck, IconDownload, IconLock, IconPlus, IconUpload, IconX } from './icons';
import './tool-workspace.css';

export type ToolRow = {
  id: string;
  name: string;
  status: string;
  message: string;
  progress: number;
  selected: boolean;
  previewUrl: string;
  originalBytes: number;
  resultBytes: number;
};

export function queueRow(
  item: {
    id: string;
    name: string;
    status: string;
    message: string;
    progress: number;
    sourceUrl: string;
    resultUrl: string;
    originalBytes: number;
    resultBytes: number;
  },
  selectedId: string,
): ToolRow {
  return {
    id: item.id,
    name: item.name,
    status: item.status,
    message: item.message,
    progress: item.progress,
    selected: item.id === selectedId,
    previewUrl: item.resultUrl || item.sourceUrl,
    originalBytes: item.originalBytes,
    resultBytes: item.resultBytes,
  };
}

export function listedErrors(...messages: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const errors: string[] = [];
  for (const message of messages) {
    const text = message?.trim() ?? '';
    if (!text || seen.has(text)) continue;
    seen.add(text);
    errors.push(text);
  }
  return errors;
}

function rowSub(row: ToolRow, show: (value: string) => string): ReactNode {
  if (row.status === 'done' && row.resultBytes > 0) {
    const delta = row.originalBytes > 0 ? Math.round((1 - row.resultBytes / row.originalBytes) * 100) : 0;
    return (
      <>
        {formatBytes(row.originalBytes)} → {formatBytes(row.resultBytes)}
        {delta > 0 ? <>{' '}<span className="down">−{delta}%</span></> : null}
      </>
    );
  }
  return show(row.message);
}

export const ToolWorkspace = observer(function ToolWorkspace({
  pageTestId,
  inputTestId,
  runTestId,
  runLabel,
  runningLabel,
  busy,
  busyMessage,
  busyProgress,
  notice,
  noticeRole,
  rootProps,
  inputProps,
  onOpen,
  onRun,
  canRun,
  doneCount,
  selectedReady,
  onDownloadSelected,
  onDownloadAll,
  rejections,
  errors,
  notes,
  emptyTitle,
  emptyCopy,
  hero,
  caption,
  settings,
  rows,
  onSelect,
  onDownloadOne,
  onDiscard,
}: {
  pageTestId: string;
  inputTestId: string;
  runTestId: string;
  runLabel: string;
  runningLabel: string;
  busy: boolean;
  busyMessage: string;
  busyProgress: number;
  notice: string;
  noticeRole: 'alert' | 'status';
  rootProps: DropzoneRootProps;
  inputProps: DropzoneInputProps;
  onOpen: () => void;
  onRun: () => void;
  canRun: boolean;
  doneCount: number;
  selectedReady: boolean;
  onDownloadSelected: () => void;
  onDownloadAll: () => void;
  rejections: readonly { name: string; reason: string }[];
  errors: readonly string[];
  notes: readonly string[];
  emptyTitle: ReactNode;
  emptyCopy: string;
  hero: ReactNode | null;
  caption: ReactNode;
  settings: ReactNode;
  rows: readonly ToolRow[];
  onSelect: (id: string) => void;
  onDownloadOne: (id: string) => void;
  onDiscard: (id: string) => void;
}) {
  const t = useText();
  const show = usePhrase();
  const captionText = typeof caption === 'string' ? show(caption) : caption;
  const hasCaption = typeof captionText === 'string' ? captionText.trim().length > 0 : Boolean(captionText);
  const selectedRow = rows.find((row) => row.selected);
  const idle = rows.length === 0 && !hero;
  const dragging = rootProps.className?.includes('is-drag') ?? false;
  const { className: _className, ...restRootProps } = rootProps;

  return (
    <div className="page" data-testid={pageTestId}>
      <main
        {...restRootProps}
        aria-busy={busy}
        className={idle ? (dragging ? 'bench bench-idle is-drag' : 'bench bench-idle') : (dragging ? 'bench is-drag' : 'bench')}
      >
        <input {...inputProps} data-testid={inputTestId} />
        <section className="hero" aria-label={t('common.selectedImage')}>
          {hero ?? (
            <div className="drop">
              <div className="drop-ic"><IconUpload /></div>
              <h1>{emptyTitle}</h1>
              <p className="drop-or">{t('common.or')}</p>
              <button type="button" className="btn btn-primary" onClick={onOpen}>
                {t('common.choose')}
              </button>
              <p className="drop-copy">{emptyCopy}</p>
            </div>
          )}
          {busy ? (
            <div className="status" role="status">
              <p>{show(busyMessage) || runningLabel}</p>
              <progress value={Number.isFinite(busyProgress) ? busyProgress : 0} max={100} />
            </div>
          ) : null}
          {!busy && notice ? (
            <div className="status" role={noticeRole}>
              <p>{show(notice)}</p>
            </div>
          ) : null}
          {!busy && !notice && hero ? (
            <ResultChip row={selectedRow} fallback={hasCaption ? captionText : null} />
          ) : null}
        </section>

        {!idle ? (
          <aside className="rail">
            <div className="rail-scroll">
              <div className="rail-head">
                <h2>{t('common.options')}</h2>
                <p className="rail-sub">{t('common.queueCount', { count: rows.length })}</p>
              </div>
              {rejections.length > 0 ? (
                <ul className="rejections" role="alert">
                  {rejections.map((rejection) => (
                    <li key={rejection.name}>{rejection.name}: {show(rejection.reason)}</li>
                  ))}
                </ul>
              ) : null}
              {errors.map((error) => (
                <p key={error} className="banner" role="alert">{show(error)}</p>
              ))}
              {notes.map((note) => (
                <p key={note} className="note">{show(note)}</p>
              ))}
              <div className="settings">{settings}</div>
            </div>
            <footer className="rail-foot">
              <button
                type="button"
                className="btn btn-primary btn-block"
                data-testid={runTestId}
                disabled={!canRun || busy}
                onClick={onRun}
              >
                {busy ? runningLabel : runLabel}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-block"
                disabled={!selectedReady}
                onClick={onDownloadSelected}
              >
                {t('common.downloadThis')}
              </button>
              {doneCount >= 2 ? (
                <button type="button" className="btn btn-ghost btn-block" onClick={onDownloadAll}>
                  {t('common.downloadZip')}
                </button>
              ) : null}
              <span className="privacy"><IconLock />{t('common.localOnly')}</span>
            </footer>
          </aside>
        ) : null}

        {rows.length > 0 ? (
          <div className="strip" aria-label={t('common.images')}>
            {rows.map((row) => (
              <div key={row.id} className={row.selected ? 'thumb on' : 'thumb'}>
                <button type="button" className="thumb-pick" onClick={() => onSelect(row.id)}>
                  <img src={row.previewUrl} alt="" />
                  <span className="t-meta">
                    <span className="t-name">{row.name}</span>
                    <span className="t-sub">{rowSub(row, show)}</span>
                  </span>
                </button>
                {row.status === 'done' ? (
                  <span className="t-state done"><IconCheck /></span>
                ) : null}
                {row.status === 'error' ? (
                  <span className="t-state err"><IconX /></span>
                ) : null}
                {row.status === 'running' ? (
                  <span className="t-prog"><i style={{ width: `${Math.max(0, Math.min(100, row.progress))}%` }} /></span>
                ) : null}
                <div className="thumb-acts">
                  {row.status === 'done' ? (
                    <button type="button" aria-label={t('common.download')} onClick={() => onDownloadOne(row.id)}>
                      <IconDownload />
                    </button>
                  ) : null}
                  <button type="button" aria-label={t('common.discard')} onClick={() => onDiscard(row.id)}>
                    <IconX />
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="thumb-add" onClick={onOpen}>
              <IconPlus />
              {t('common.add')}
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
});

function ResultChip({ row, fallback }: { row: ToolRow | undefined; fallback: ReactNode }) {
  if (row && row.status === 'done' && row.originalBytes > 0 && row.resultBytes > 0) {
    const delta = Math.round((1 - row.resultBytes / row.originalBytes) * 100);
    return (
      <div className="result-chip">
        <span className="mono name">{row.name}</span>
        <span className="sep" />
        <span className="mono">{formatBytes(row.originalBytes)} → {formatBytes(row.resultBytes)}</span>
        {delta > 0 ? <span className="down mono">−{delta}%</span> : null}
      </div>
    );
  }
  if (!fallback) return null;
  return <div className="result-chip">{fallback}</div>;
}

export function Seg({
  label,
  column = false,
  wrap = false,
  className,
  children,
}: {
  label: string;
  column?: boolean;
  wrap?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const layout = [column ? 'seg seg-col' : wrap ? 'seg seg-wrap' : 'seg', className].filter(Boolean).join(' ');
  return (
    <div className="opt">
      <span className="opt-label">{label}</span>
      <div className={layout} role="group" aria-label={label}>{children}</div>
    </div>
  );
}

export function SliderRow({
  label,
  value,
  min,
  max,
  ariaLabel,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  ariaLabel: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="opt">
      <span className="opt-label">{label}</span>
      <div className="slider-row">
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          aria-label={ariaLabel}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <span className="val">{value}</span>
      </div>
    </div>
  );
}

export function CheckRow({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="check-row">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="box" aria-hidden="true" />
      <span>{children}</span>
    </label>
  );
}
