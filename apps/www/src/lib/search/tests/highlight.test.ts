// @vitest-environment happy-dom

import { describe, expect, it, vi } from 'vitest';

import { SEARCH_QUERY_MAX_LENGTH } from '../client.types';
import { highlightSearchTerms, normalizeSearchHighlightQuery } from '../highlight';
import type { PagefindHighlightOptions } from '../highlight.types';

describe('Pagefind result highlighting', () => {
  it('keeps only bounded, non-empty highlight parameters', () => {
    const excessiveTerms = new URLSearchParams(
      Array.from({ length: 21 }, (_, index) => ['h', `x${String(index)}`])
    );

    expect([
      normalizeSearchHighlightQuery(
        '?source=search&h=%D1%8F&h=%D1%82%D0%B0%D1%80%D0%B8%D1%84&h=%D1%82%D0%B0%D1%80%D0%B8%D1%84&h=815'
      ),
      normalizeSearchHighlightQuery('?h=%D1%8F'),
      normalizeSearchHighlightQuery('?h='),
      normalizeSearchHighlightQuery(`?h=${'x'.repeat(SEARCH_QUERY_MAX_LENGTH + 1)}`),
      normalizeSearchHighlightQuery(`?${excessiveTerms.toString()}`)
    ]).toMatchInlineSnapshot(`
      [
        "?h=%D1%82%D0%B0%D1%80%D0%B8%D1%84&h=815",
        "",
        "",
        "",
        "",
      ]
    `);
  });

  it('loads and configures Pagefind only when highlights are requested', async () => {
    const construct = vi.fn<(options: PagefindHighlightOptions) => void>();
    class PagefindHighlight {
      constructor(options: PagefindHighlightOptions) {
        construct(options);
      }
    }
    const loadPagefindHighlight = vi.fn(async () => PagefindHighlight);

    history.replaceState({}, '', '/?source=search');
    await highlightSearchTerms(location.href, loadPagefindHighlight);
    expect(loadPagefindHighlight).not.toHaveBeenCalled();

    history.replaceState({}, '', '/?h=tariff');
    await highlightSearchTerms(location.href, loadPagefindHighlight);
    expect({
      constructCalls: construct.mock.calls,
      loadCalls: loadPagefindHighlight.mock.calls.length
    }).toMatchInlineSnapshot(`
      {
        "constructCalls": [
          [
            {
              "addStyles": false,
              "highlightParam": "h",
              "markOptions": {
                "className": "search-highlight",
                "exclude": [
                  "[data-pagefind-ignore]:not([data-search-adaptive-copy])",
                  "[data-pagefind-ignore]:not([data-search-adaptive-copy]) *",
                ],
              },
            },
          ],
        ],
        "loadCalls": 1,
      }
    `);
  });

  it('does not let a stale import highlight a later Astro page', async () => {
    const construct = vi.fn();
    class PagefindHighlight {
      constructor() {
        construct();
      }
    }
    let resolveLoader: (value: typeof PagefindHighlight) => void = () => {};
    const loadPagefindHighlight = () =>
      new Promise<typeof PagefindHighlight>((resolve) => {
        resolveLoader = resolve;
      });
    history.replaceState({}, '', '/first/?h=tariff');

    const highlighting = highlightSearchTerms(location.href, loadPagefindHighlight);
    history.replaceState({}, '', '/second/?h=tariff');
    resolveLoader(PagefindHighlight);
    await highlighting;

    expect(construct).not.toHaveBeenCalled();
  });

  it('allows the alternate view but still excludes nested and unrelated ignored text', async () => {
    document.body.innerHTML = `
      <div data-pagefind-ignore="all" data-search-adaptive-copy>
        <span id="wide">Газ</span>
        <span data-pagefind-ignore><b id="nested">Газ</b></span>
      </div>
      <div><span id="mobile">Газ</span></div>
      <div data-pagefind-ignore><span id="other">Газ</span></div>`;
    const excluded: string[] = [];
    class PagefindHighlight {
      constructor(options: PagefindHighlightOptions) {
        for (const node of document.querySelectorAll(options.markOptions.exclude.join(','))) {
          if (node.id) excluded.push(node.id);
        }
      }
    }
    history.replaceState({}, '', '/?h=Газ');
    await highlightSearchTerms(location.href, async () => PagefindHighlight);
    expect(excluded.sort()).toMatchInlineSnapshot(`
      [
        "nested",
        "other",
      ]
    `);
  });
});
