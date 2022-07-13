import { observer } from '@rabjs/react';
import { Link } from 'react-router-dom';
import { IconArrow, ToolGlyph } from '../../components/icons';
import { useText } from '../../i18n/use-text';
import { toolGroups, tools, type ToolGroup } from '../../tools/registry';
import './home.css';

const Home = observer(() => {
  const t = useText();
  const groupLabel = (group: ToolGroup) =>
    group === 'smart'
      ? t('home.groupSmart')
      : group === 'basic'
        ? t('home.groupBasic')
        : group === 'convert'
          ? t('home.groupConvert')
          : t('home.groupCreate');

  return (
    <main className="page">
      <div className="home-hero">
        <span className="hero-kicker"><span className="dot" />{t('home.kicker')}</span>
        <h1>
          {t('home.titleA')}
          <br />
          {t('home.titleB')}
        </h1>
        <p className="sub">{t('home.sub')}</p>
        <div className="hero-points">
          <span>{t('home.pointFree')}</span>
          <span>{t('home.pointAccount')}</span>
          <span>{t('home.pointBatch')}</span>
          <span>{t('home.pointOffline')}</span>
        </div>
      </div>

      <div className="catalog" aria-label={t('home.tools')}>
        {toolGroups.map((group) => (
          <section key={group} className="cat-group">
            <h2>
              {groupLabel(group)}
              {group === 'smart' ? <em>· {t('home.groupSmartNote')}</em> : null}
            </h2>
            <div className="tool-grid">
              {tools.filter((tool) => tool.group === group).map((tool) => (
                <Link
                  key={tool.id}
                  to={tool.path}
                  className="tool-card"
                  style={{ '--tc': tool.color } as React.CSSProperties}
                  data-testid={`tool-${tool.id}`}
                >
                  <span className="tool-ic"><ToolGlyph id={tool.id} /></span>
                  <div className="tool-body">
                    <h3>
                      {t(`tools.${tool.id}.title`)}
                      {tool.badge ? <span className="tool-badge">{tool.badge}</span> : null}
                    </h3>
                    <p>{t(`tools.${tool.id}.description`)}</p>
                    <div className="tool-fmts">
                      {tool.formats.map((format) => <span key={format}>{format}</span>)}
                    </div>
                  </div>
                  <span className="tool-go" aria-hidden="true"><IconArrow /></span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <footer className="home-foot">
        <span>{t('home.foot')}</span>
      </footer>
    </main>
  );
});

export default Home;
