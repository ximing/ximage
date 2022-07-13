import i18n from './index';

const SEP = '\u001f';
const KEY = /^[a-z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

export type PhraseParams = Record<string, string | number>;

/** Store a catalog key, plus params when the sentence needs them. The UI translates it. */
export function phrase(key: string, params?: PhraseParams): string {
  if (!params || Object.keys(params).length === 0) return key;
  return `${key}${SEP}${JSON.stringify(params)}`;
}

export function isPhrase(value: string): boolean {
  const key = value.split(SEP)[0] ?? '';
  return KEY.test(key);
}

export function renderPhrase(value: string, lng: string): string {
  if (!value) return value;
  const index = value.indexOf(SEP);
  const key = index < 0 ? value : value.slice(0, index);
  if (!KEY.test(key) || !i18n.exists(key)) return value;
  let params: Record<string, unknown> | undefined;
  if (index >= 0) {
    try {
      const parsed: unknown = JSON.parse(value.slice(index + 1));
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return value;
      params = parsed as Record<string, unknown>;
    } catch {
      return value;
    }
  }
  const translated = i18n.t(key, { ...params, lng });
  return typeof translated === 'string' ? translated : value;
}
