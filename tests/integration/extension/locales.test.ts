import { PRODUCT_NAME, UI_LANGUAGES } from '@writehand/contracts';
import { countWith, manifestMessages, textFor, uiLanguageFor } from '@writehand/locales';
import { describe, expect, it } from 'vitest';

/** The plain strings in the text tree with their paths (function-valued texts excluded). */
function strings(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'string') return [[path, value]];
  if (typeof value !== 'object' || value === null) return [];
  return Object.entries(value).flatMap(([key, child]) => strings(child, path ? `${path}.${key}` : key));
}

describe('UI languages', () => {
  it('"Automatic" picks the first supported browser language and falls back to English', () => {
    expect(uiLanguageFor('auto', ['de-AT', 'en-US'])).toBe('de');
    expect(uiLanguageFor('auto', ['fr-CA'])).toBe('fr');
    expect(uiLanguageFor('auto', ['es-419'])).toBe('es');
    expect(uiLanguageFor('auto', ['pt-BR'])).toBe('en');
  });

  it.each(UI_LANGUAGES)('%s: has the right language code and no empty strings', (language) => {
    const text = textFor(language);

    expect(text.ui.locale).toBe(language);
    for (const [path, value] of strings(text)) {
      expect(value.trim(), path).not.toBe('');
    }
  });

  it.each(UI_LANGUAGES.filter((language) => language !== 'en'))(
    '%s: leaves no English sentence untranslated',
    (language) => {
      const english = new Map(strings(textFor('en')));
      // Short texts (e.g. "Neutral", product names) may be identical across languages; sentences may not.
      const untranslated = strings(textFor(language))
        .filter(([path, value]) => value.length > 30 && english.get(path) === value)
        .map(([path]) => path);

      expect(untranslated).toEqual([]);
    },
  );

  it('uses the product name as the manifest name in every language and keeps the description within the store limit', () => {
    const messages = manifestMessages();
    expect(Object.keys(messages).sort()).toEqual([...UI_LANGUAGES].sort());
    for (const language of UI_LANGUAGES) {
      expect(messages[language].extName.message).toBe(PRODUCT_NAME);
      // The Chrome Web Store and Chromium accept at most 132 characters for the manifest description.
      expect(messages[language].extDescription.message.length, language).toBeLessThanOrEqual(132);
    }
  });

  it('contains no developer instructions in user-facing text', () => {
    for (const language of UI_LANGUAGES) {
      const developer = strings(textFor(language)).filter(([, value]) => /pnpm |docs\/|\.md\b/.test(value));
      expect(developer, language).toEqual([]);
    }
  });

  it('does not hard-code the product name in texts', () => {
    for (const language of UI_LANGUAGES) {
      const hardCoded = strings(textFor(language)).filter(([, value]) => value.includes('Email Writer'));
      expect(hardCoded, language).toEqual([]);
    }
  });

  it("writes counts with the language's plural rule", () => {
    expect(countWith('en')(0, 'message', 'messages')).toBe('0 messages');
    expect(countWith('fr')(0, 'message', 'messages')).toBe('0 message');
    expect(countWith('de')(1, 'Nachricht', 'Nachrichten')).toBe('1 Nachricht');
    expect(countWith('es')(2, 'mensaje', 'mensajes')).toBe('2 mensajes');
  });
});
