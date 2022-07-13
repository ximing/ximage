import { ReactCompareSlider } from 'react-compare-slider';

export function CompareView({
  before,
  after,
  beforeLabel,
  afterLabel,
  alt,
  checker = false,
  testId,
}: {
  before: string;
  after: string;
  beforeLabel: string;
  afterLabel: string;
  alt: string;
  checker?: boolean;
  testId?: string;
}) {
  return (
    <div className="compare-stage" data-testid={testId}>
      <ReactCompareSlider
        defaultPosition={56}
        itemOne={(
          <div className="fit">
            <img src={before} alt={`${beforeLabel}, ${alt}`} draggable={false} />
          </div>
        )}
        itemTwo={(
          <div className={checker ? 'fit checker' : 'fit'}>
            <img src={after} alt={afterLabel} draggable={false} />
          </div>
        )}
        handle={<span className="handle" />}
        style={{ width: '100%', height: '100%' }}
      />
      <span className="compare-tag l">{beforeLabel}</span>
      <span className="compare-tag r">{afterLabel}</span>
    </div>
  );
}

export function BeforeAfter({
  status,
  sourceUrl,
  resultUrl,
  name,
  beforeLabel,
  afterLabel,
}: {
  status: string;
  sourceUrl: string;
  resultUrl: string;
  name: string;
  beforeLabel: string;
  afterLabel: string;
}) {
  if (status === 'done' && resultUrl && sourceUrl) {
    return (
      <CompareView
        before={sourceUrl}
        after={resultUrl}
        beforeLabel={beforeLabel}
        afterLabel={afterLabel}
        alt={name}
      />
    );
  }
  return (
    <div className="fit">
      <img src={resultUrl || sourceUrl} alt={name} />
    </div>
  );
}
