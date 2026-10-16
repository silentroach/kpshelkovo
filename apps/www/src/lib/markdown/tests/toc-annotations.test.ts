import {
  createMarkdownDocument,
  parseMarkdownFragment,
  serializeMarkdownDocument
} from '@shelkovo/markdown';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

import { createSiteMentionRegistry } from '@/lib/mentions';

import { transformContentEmphasis } from '../content-emphasis';
import { appendEditorialMapCaptions } from '../editorial-maps-companion';
import { preprocessSiteMarkdown, renderMarkdown } from '../render';

describe('TOC annotations in the site pipeline', () => {
  it('preserves mentions, references, callouts, maps and code across formats', () => {
    const registry = createSiteMentionRegistry([
      {
        type: 'person',
        slug: 'resident',
        label: 'Resident',
        labelCases: { gen: 'Residents' },
        htmlUrl: '/people/resident/',
        markdownUrl: '/people/resident/index.md'
      }
    ]);
    const input = `[TOC]

::toc-group[Group @resident:gen]

## :toc-omit[Appendix @resident:gen:] 4. [Terms][source]

> [!NOTE]
> **[Original][source]**
>
> @resident:gen: ordinary :unknown[value].

~~~map
{"type":"FeatureCollection","metadata":{"name":"Map"},"features":[{"type":"Feature","properties":{},"geometry":{"type":"Point","coordinates":[37,55]}}]}
~~~

~~~md
::toc-group[Example @unknown:gen]
## :toc-omit[Literal]
~~~

\`:toc-omit[@unknown:gen]\`

[source]: https://example.com/source`;
    const prepared = preprocessSiteMarkdown(input, { mentions: { registry, context: 'TOC test' } });
    const second = preprocessSiteMarkdown(prepared.markdown, {
      mentions: { registry, context: 'TOC test' }
    });
    expect(second.markdown).toBe(prepared.markdown);
    expect(prepared.mentions.map((mention) => mention.slug)).toMatchInlineSnapshot(`
      [
        "resident",
      ]
    `);
    const document = new Window().document;
    document.body.innerHTML = renderMarkdown(prepared.markdown, { editorialMaps: true });
    const companion = serializeMarkdownDocument(
      createMarkdownDocument({
        children: appendEditorialMapCaptions(
          transformContentEmphasis(parseMarkdownFragment(prepared.markdown), 'markdown'),
          'TOC test'
        )
      })
    );
    expect({
      groups: [...document.querySelectorAll('.ui-markdown-toc__group-title')].map(
        (node) => node.textContent
      ),
      toc: [...document.querySelectorAll('nav a')].map((node) => [
        node.textContent,
        node.getAttribute('href')
      ]),
      heading: document.querySelector('h2')?.getAttribute('aria-label'),
      noteSource: document.querySelector('aside a')?.getAttribute('href'),
      maps: document.querySelectorAll('editorial-map').length
    }).toMatchInlineSnapshot(`
      {
        "groups": [
          "Group Residents",
        ],
        "heading": "Appendix Residents: 4. Terms",
        "maps": 1,
        "noteSource": "https://example.com/source",
        "toc": [
          [
            "4. Terms",
            "#appendix-residents-4-terms",
          ],
        ],
      }
    `);
    expect(companion).toContain('**Group Residents**');
    expect(companion).toContain('[4. Terms](#appendix-residents-4-terms)');
    expect(companion).toContain('## Appendix [Residents](/people/resident/): 4. [Terms][source]');
    expect(companion).toContain('::toc-group[Example @unknown:gen]');
    expect(companion).toContain('`:toc-omit[@unknown:gen]`');
    expect(companion).not.toContain('toc-group[Group');
    expect(companion).not.toContain('toc-omit[Appendix');
  });
});
