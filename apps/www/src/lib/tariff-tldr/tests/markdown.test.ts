import { Window } from 'happy-dom';
import { describe, expect, it, vi } from 'vitest';

import { renderMarkdown } from '@/lib/markdown/render';
import { createSiteMentionRegistry } from '@/lib/mentions';

import { TARIFF_TLDR } from '../content';
import { buildTariffTldrMarkdown } from '../markdown';

vi.mock('@/data/tariff-tldr.md?raw', () => ({
  default: `# Tariff overview

> [!NOTE]
> **[Source dated 2026-08-11](https://example.com/post)**
>
> A resident's quote.

> **Author's wording** with [the beach](@beach) and [details][details].
>
> - 815 per month
> - [Local section](#cost), [relative page](../regulation/) and [«Beach»](@beach)

[details]: /815/regulation/`
}));

const registry = createSiteMentionRegistry([
  {
    type: 'place',
    slug: 'beach',
    label: 'Beach',
    htmlUrl: '/map/beach/',
    markdownUrl: '/map/beach/index.md'
  }
]);

const documentFrom = (html: string) => {
  const document = new Window().document;
  document.body.innerHTML = html;
  return document;
};

describe('tariff overview public representations', () => {
  it('keeps attribution, complete quote and list in the shared HTML and Markdown pipeline', () => {
    const html = documentFrom(
      renderMarkdown(TARIFF_TLDR.bodyMarkdown, {
        mentions: { registry, context: '/815/tldr/' }
      })
    );
    const companion = documentFrom(renderMarkdown(buildTariffTldrMarkdown(registry)));

    expect(companion.querySelector('h1')?.firstChild?.textContent).toBe(TARIFF_TLDR.title);
    expect(html.querySelectorAll('h1')).toHaveLength(0);
    expect(companion.querySelector('blockquote:last-of-type')?.textContent).toBe(
      html.querySelector('blockquote')?.textContent
    );
    expect(companion.querySelector('p')?.textContent).toBe(html.querySelector('p')?.textContent);
    expect(companion.querySelectorAll('blockquote li')).toHaveLength(2);
    expect(html.querySelector('.ui-callout__title a')?.getAttribute('href')).toBe(
      'https://example.com/post'
    );
  });

  it('publishes absolute links and resolves mentions without changing their labels', () => {
    const document = documentFrom(renderMarkdown(buildTariffTldrMarkdown(registry)));
    expect(
      [...document.querySelectorAll('p a, blockquote a')].map((link) => ({
        text: link.textContent,
        href: link.getAttribute('href')
      }))
    ).toMatchInlineSnapshot(`
      [
        {
          "href": "https://example.com/post",
          "text": "Source dated 11.08.2026",
        },
        {
          "href": "https://kpshelkovo.online/map/beach/",
          "text": "the beach",
        },
        {
          "href": "https://kpshelkovo.online/815/regulation/",
          "text": "details",
        },
        {
          "href": "https://kpshelkovo.online/815/tldr/#cost",
          "text": "Local section",
        },
        {
          "href": "https://kpshelkovo.online/815/regulation/",
          "text": "relative page",
        },
        {
          "href": "https://kpshelkovo.online/map/beach/",
          "text": "«Beach»",
        },
      ]
    `);
  });

  it('rejects an unknown mention instead of publishing an unresolved link', () => {
    expect(() => buildTariffTldrMarkdown(new Map())).toThrow(/beach/u);
  });
});
