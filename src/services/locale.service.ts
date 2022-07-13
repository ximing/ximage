import { Service } from '@rabjs/react';
import i18n from '../i18n';

export type LocaleName = 'zh' | 'en';

export class LocaleService extends Service {
  locale: LocaleName = 'zh';

  setLocale(locale: LocaleName) {
    this.locale = locale;
    void i18n.changeLanguage(locale);
    this.persist();
  }

  persist() {
    if (typeof document !== 'undefined') document.documentElement.lang = this.locale;
    try {
      localStorage.setItem('ximage-locale', this.locale);
    } catch {
      /* private mode / node */
    }
  }
}
