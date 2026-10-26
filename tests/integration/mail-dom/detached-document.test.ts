import { extractTextBlocks, isRenderedElement, readComposerAnatomy } from '@writehand/mail-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The Outlook add-in parses body HTML from Office.js into a detached document. A browser has no
 * layout for it, so `checkVisibility` reports every element as hidden; the readers must fall back
 * to the markup instead of dropping all text. (The test DOM has no `checkVisibility`; it is
 * stubbed here the way a browser answers for an unrendered document.)
 */
describe('mail-dom on a detached document', () => {
  afterEach(() => vi.restoreAllMocks());

  const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html').body;

  it('reads the text of an unrendered document and still skips text hidden by its markup', () => {
    Object.defineProperty(Element.prototype, 'checkVisibility', {
      configurable: true,
      value: vi.fn(() => false),
    });
    try {
      const body = parse(
        '<div>Merhaba Deniz,</div><div style="display:none">izleme metni</div><div hidden>gizli</div><div>Perşembe uygun.</div>',
      );

      const text = extractTextBlocks(body)
        .blocks.map((block) => block.text)
        .join('\n');
      expect(text).toContain('Merhaba Deniz,');
      expect(text).toContain('Perşembe uygun.');
      expect(text).not.toContain('izleme');
      expect(text).not.toContain('gizli');
      expect(isRenderedElement(body.firstElementChild as HTMLElement)).toBe(true);
      expect(readComposerAnatomy(body, { classify: () => null, isReply: false }).editableText).toContain(
        'Perşembe uygun.',
      );
    } finally {
      delete (Element.prototype as { checkVisibility?: unknown }).checkVisibility;
    }
  });
});
