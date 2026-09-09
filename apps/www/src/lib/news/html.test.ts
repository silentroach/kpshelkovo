import { describe, expect, it } from 'vitest';

import { renderNewsMarkdown } from './html';

describe('renderNewsMarkdown', () => {
  it('applies typography inside markdown links', () => {
    expect(renderNewsMarkdown('[Шелково Парк](/815/compare/)')).toBe(
      '<p><a href="/815/compare/">Шелково\u00A0Парк</a></p>'
    );
  });

  it('keeps spaces around inline links', () => {
    expect(renderNewsMarkdown('Встреча по обсуждению [регламента](/docs).')).toBe(
      '<p>Встреча по\u00A0обсуждению <a href="/docs">регламента</a>.</p>'
    );
  });

  it('does not render raw html from markdown', () => {
    const html = renderNewsMarkdown('<span data-title="Шелково Парк">Шелково Парк</span>');

    expect(html).not.toContain('<span');
    expect(html).not.toContain('data-title=');
    expect(html).toBe('<p>Шелково\u00A0Парк</p>');
  });
});
