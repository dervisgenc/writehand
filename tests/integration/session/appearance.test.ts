import { resolveAppearance } from '@writehand/session';
import { describe, expect, it } from 'vitest';

describe('extension appearance', () => {
  const outlookDark = {
    scheme: 'dark' as const,
    colors: { background: '#292929', text: '#ffffff', accent: '#115ea3' },
  };

  it('uses the Outlook theme colors and light/dark mode when set to "automatic"', () => {
    expect(resolveAppearance('system', outlookDark)).toEqual({
      theme: 'dark',
      skin: 'fluent',
      style: { '--ew-color-bg': '#292929', '--ew-color-text': '#ffffff', '--ew-color-accent': '#115ea3' },
    });
  });

  it('falls back to the system preference when the Outlook theme cannot be read, and follows an explicit light/dark choice', () => {
    expect(resolveAppearance('system', null)).toEqual({ theme: 'system', skin: 'fluent', style: {} });
    expect(resolveAppearance('light', outlookDark)).toEqual({ theme: 'light', skin: 'fluent', style: {} });
  });

  it("keeps the mail service's design language whatever the theme", () => {
    const gmailLight = { scheme: 'light' as const, colors: { background: 'rgb(255, 255, 255)' } };
    expect(resolveAppearance('system', gmailLight, 'material')).toEqual({
      theme: 'light',
      skin: 'material',
      style: { '--ew-color-bg': 'rgb(255, 255, 255)' },
    });
    expect(resolveAppearance('dark', null, 'material')).toMatchObject({ theme: 'dark', skin: 'material' });
  });
});
