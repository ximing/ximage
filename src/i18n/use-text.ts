import { useService } from '@rabjs/react';
import i18n from './index';
import { renderPhrase } from './phrase';
import { LocaleService } from '../services/locale.service';

export function useText() {
  const locale = useService(LocaleService);
  const current = locale.locale;
  return (key: string, params?: Record<string, unknown>) => {
    const translated = i18n.t(key, { ...params, lng: current });
    return typeof translated === 'string' ? translated : key;
  };
}

export function usePhrase() {
  const locale = useService(LocaleService);
  const current = locale.locale;
  return (value: string) => renderPhrase(value, current);
}
