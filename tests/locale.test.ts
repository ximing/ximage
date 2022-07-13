import { Container, register, resolve } from '@rabjs/react';
import { describe, expect, test } from 'vitest';
import { phrase, renderPhrase } from '../src/i18n/phrase';
import { en } from '../src/locales/en';
import { zh } from '../src/locales/zh';
import { LocaleService } from '../src/services/locale.service';

function leaves(value: unknown, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  if (typeof value === 'string') {
    out.set(prefix, value);
    return out;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const next = prefix ? `${prefix}.${key}` : key;
      for (const [childKey, childValue] of leaves(child, next)) out.set(childKey, childValue);
    }
  }
  return out;
}

describe('locale', () => {
  test('defaults to Chinese and a second reader sees English', () => {
    const container = new Container({ name: 'locale-test' });
    register(LocaleService, undefined, container);
    const writer = resolve(LocaleService, container);
    expect(writer.locale).toBe('zh');

    writer.setLocale('en');
    const reader = resolve(LocaleService, container);
    expect(reader).toBe(writer);
    expect(reader.locale).toBe('en');
    expect(renderPhrase(phrase('shell.themeDark'), reader.locale)).toBe('Dark theme');

    writer.setLocale('zh');
    expect(reader.locale).toBe('zh');
    expect(renderPhrase(phrase('shell.themeDark'), reader.locale)).toBe('深色主题');
    expect(renderPhrase(phrase('reason.only', { types: 'JPG, PNG' }), 'zh')).toBe('只能添加 JPG, PNG 图片。');
    expect(renderPhrase('Failed to fetch', 'zh')).toBe('Failed to fetch');
  });

  test('Chinese and English catalogs have the same non-empty keys', () => {
    const english = leaves(en);
    const chinese = leaves(zh);
    expect([...chinese.keys()].sort()).toEqual([...english.keys()].sort());
    for (const value of english.values()) expect(value.trim().length).toBeGreaterThan(0);
    for (const value of chinese.values()) expect(value.trim().length).toBeGreaterThan(0);
  });
});
