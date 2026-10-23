import { tr } from '@writehand/locales';
import { LanguagePicker, languageLabel, matchLanguage, provideUiText } from '@writehand/ui';
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import { defineComponent, h, ref, type Component } from 'vue';

describe('Language names and matching', () => {
  it('maps a name in the UI language, an English name or a code to the catalog code', () => {
    expect(matchLanguage('Almanca', 'tr')).toBe('de');
    expect(matchLanguage('german', 'tr')).toBe('de');
    expect(matchLanguage('brezilya portekizcesi', 'tr')).toBe('pt-BR');
    expect(matchLanguage('ja', 'en')).toBe('ja');
    expect(matchLanguage('Kurmancî', 'tr')).toBe('Kurmancî');
    expect(languageLabel('zh-Hans', 'tr')).toBe('Basitleştirilmiş Çince');
    expect(languageLabel('Kurmancî', 'tr')).toBe('Kurmancî');
  });
});

function picker(props: Record<string, unknown>) {
  const emitted: unknown[] = [];
  const Host = defineComponent({
    setup() {
      provideUiText(ref(tr.ui));
      return () =>
        h(LanguagePicker as Component, {
          ...props,
          'onUpdate:modelValue': (value: unknown) => emitted.push(value),
          onSubmit: () => emitted.push('submit'),
        });
    },
  });
  return { wrapper: mount(Host), emitted };
}

describe('LanguagePicker', () => {
  it('emits the code of a typed or picked language, and reverts to the last value on invalid input', async () => {
    const { wrapper, emitted } = picker({ modelValue: 'en' });
    const input = wrapper.get('input');
    expect((input.element as HTMLInputElement).value).toBe('İngilizce');

    await input.setValue('Japonca');
    await input.trigger('keydown', { key: 'Enter' });
    expect(emitted).toEqual(['ja', 'submit']);

    await input.setValue('a<b');
    await input.trigger('blur');
    expect((input.element as HTMLInputElement).value).toBe('Japonca');
    expect(emitted).toEqual(['ja', 'submit']);
    wrapper.unmount();
  });

  it('clears the add field on commit and does not suggest languages already added', async () => {
    const { wrapper, emitted } = picker({ modelValue: null, clearOnCommit: true, exclude: ['de'] });
    const options = wrapper.findAll('option').map((option) => option.attributes('value'));
    expect(options).not.toContain('Almanca');
    expect(options).toContain('İtalyanca');

    const input = wrapper.get('input');
    await input.setValue('Kurmancî');
    await input.trigger('keydown', { key: 'Enter' });
    expect(emitted).toEqual(['Kurmancî', 'submit']);
    expect((input.element as HTMLInputElement).value).toBe('');
    wrapper.unmount();
  });
});
