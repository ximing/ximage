import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from '../locales/en';
import { zh } from '../locales/zh';

void i18n.use(initReactI18next).init({
  resources: {
    zh: { translation: zh },
    en: { translation: en },
  },
  lng: 'zh',
  fallbackLng: 'zh',
  interpolation: { escapeValue: false },
  returnNull: false,
  initAsync: false,
});

export default i18n;
