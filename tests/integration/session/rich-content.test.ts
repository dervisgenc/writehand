import type { ApplyRequest } from '@writehand/contracts';
import { clipboardContent, withRichContent } from '@writehand/session';
import { describe, expect, it } from 'vitest';

import { scopeA } from '../../fixtures/synthetic-mail/threads';

const composerRef = { scope: scopeA, composerKey: 'c1', threadKey: 'thread-a' };
const body = (text: string): ApplyRequest => ({
  applyOperationId: 'a',
  target: { mode: 'replace-body', composerRef, expectedRevision: 1 },
  text,
});

describe('Rich content preparation', () => {
  it('leaves text bound for an in-sentence selection unchanged', () => {
    const request: ApplyRequest = {
      applyOperationId: 'a',
      target: { mode: 'replace-selection', composerRef, expectedRevision: 1, selectionId: 's' },
      text: '**salon**',
    };
    expect(withRichContent(request)).toBe(request);
  });

  it('produces no HTML for unformatted text and only cleans up the plain text', () => {
    expect(withRichContent(body('Merhaba,\n\nTeşekkürler.'))).toEqual(body('Merhaba,\n\nTeşekkürler.'));
  });

  it('produces HTML, plain text and verification text for tables and bold text', () => {
    const request = withRichContent(body('**Özet**\n\n| Ürün | Fiyat |\n| --- | --- |\n| A | 10 |'));
    expect(request.text).toBe('Özet\n\nÜrün | Fiyat\nA | 10');
    expect(request.rich?.html).toContain('<b>Özet</b>');
    expect(request.rich?.html).toContain('<table');
    expect(request.rich?.visibleText).toBe('Özet\nÜrün | Fiyat\nA | 10');
  });

  it('also provides HTML for formatted content when copying', () => {
    expect(clipboardContent('- bir\n- iki')).toEqual({
      text: '- bir\n- iki',
      html: '<ul style="margin-top:0;margin-bottom:0"><li>bir</li><li>iki</li></ul>',
    });
    expect(clipboardContent('Düz metin')).toEqual({ text: 'Düz metin', html: null });
  });
});
