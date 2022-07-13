import { observer } from '@rabjs/react';
import { useText } from '../../i18n/use-text';
import type { Tool } from '../../tools/registry';
import '../../components/tool-workspace.css';
import './unavailable.css';

const Unavailable = observer(({ tool }: { tool: Tool }) => {
  const t = useText();
  return (
    <main className="page unavailable" data-testid={`page-${tool.id}`}>
      <section className="hero">
        <div className="drop">
          <h1>{t(`tools.${tool.id}.title`)}</h1>
          <p className="drop-copy">{t('common.unavailable')}</p>
        </div>
      </section>
    </main>
  );
});

export default Unavailable;
