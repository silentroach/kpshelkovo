// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';

import { render, renderWithMetadata } from './index';

const markdown = `[TOC]

## Раздел

## Раздел

[Локально](#раздел) [Encoded](#%D1%80%D0%B0%D0%B7%D0%B4%D0%B5%D0%BB)
[Контейнер](#offer-other) [Страница](/kb/example/#раздел)
[Внешняя](https://example.com/#раздел) [Ошибка](#%ZZ)

Текст[^note] и повтор[^note].

- [ ] Проверить

[^note]: Сноска.
`;

describe('local HTML targets', () => {
  it('isolates repeated bodies including TOC, permalinks, footnotes and task labels', () => {
    const bodies = ['offer-first-body-', 'offer-second-body-'].map((idPrefix) =>
      renderWithMetadata(markdown, { idPrefix })
    );
    document.body.innerHTML = bodies
      .map((body, index) => `<section data-body="${index}">${body.html}</section>`)
      .join('');

    const ids = [...document.querySelectorAll('[id]')].map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const [index, body] of bodies.entries()) {
      const fragment = document.querySelector(`[data-body="${index}"]`)!;
      expect([...body.localIds.values()].every((id) => ids.includes(id))).toBe(true);
      expect(fragment.querySelectorAll('h2[id]').length).toBe(3);
      expect(fragment.querySelectorAll('[data-footnote-ref]').length).toBe(2);
      expect(fragment.querySelectorAll('[data-footnote-backref]').length).toBe(2);

      for (const link of fragment.querySelectorAll('a[href^="#"]')) {
        const href = link.getAttribute('href')!;
        if (href === '#offer-other' || href === '#%ZZ') {
          continue;
        }
        const target = document.getElementById(decodeURIComponent(href.slice(1)));
        expect(target, href).toBeTruthy();
        expect(fragment.contains(target), href).toBe(true);
      }

      for (const node of fragment.querySelectorAll('[aria-describedby], [aria-labelledby]')) {
        const targetIds = (
          node.getAttribute('aria-describedby') ?? node.getAttribute('aria-labelledby')!
        ).split(/\s+/u);
        expect(targetIds.every((id) => fragment.contains(document.getElementById(id)))).toBe(true);
      }

      expect(
        [...fragment.querySelectorAll('a')]
          .map((node) => node.getAttribute('href'))
          .filter((href) => !href?.startsWith(`#offer-${index === 0 ? 'first' : 'second'}-body-`))
      ).toMatchInlineSnapshot(`
        [
          "#offer-other",
          "/kb/example/#%D1%80%D0%B0%D0%B7%D0%B4%D0%B5%D0%BB",
          "https://example.com/#%D1%80%D0%B0%D0%B7%D0%B4%D0%B5%D0%BB",
          "#%ZZ",
        ]
      `);
    }
  });

  it('exposes the exact final HAST map, including transformed targets, for companions', () => {
    const rendered = renderWithMetadata('## Section\n\nText[^note].\n\n[^note]: Note.', {
      idPrefix: 'body-',
      transform: (tree, reserveId) => {
        tree.children.push({
          type: 'paragraph',
          data: { hProperties: { id: reserveId('Inserted') } },
          children: [{ type: 'text', value: 'Extra' }]
        });
      }
    });

    expect([...rendered.localIds]).toMatchInlineSnapshot(`
      [
        [
          "section",
          "body-section",
        ],
        [
          "user-content-fnref-note",
          "body-user-content-fnref-note",
        ],
        [
          "inserted",
          "body-inserted",
        ],
        [
          "footnote-label",
          "body-footnote-label",
        ],
        [
          "user-content-fn-note",
          "body-user-content-fn-note",
        ],
      ]
    `);
  });

  it('rewrites string and array IDREF properties only when the target belongs to the fragment', () => {
    const html = render('Label\n\nControl', {
      idPrefix: 'body-',
      transform: (tree) => {
        tree.children[0].data = {
          hName: 'label',
          hProperties: {
            id: 'label',
            htmlFor: 'control',
            ariaDescribedBy: ['control', 'outside'],
            ariaLabelledBy: 'label outside',
            ariaControls: 'control',
            ariaOwns: ['control', 'outside']
          }
        };
        tree.children[1].data = { hProperties: { id: 'control' } };
      }
    });

    document.body.innerHTML = html;
    expect(document.querySelector('label')?.outerHTML).toMatchInlineSnapshot(
      `"<label id="body-label" for="body-control" aria-describedby="body-control outside" aria-labelledby="body-label outside" aria-controls="body-control" aria-owns="body-control outside">Label</label>"`
    );
  });

  it('preserves existing HTML without the option or with an empty prefix', () => {
    const original = renderWithMetadata('## Section');
    expect(original.html).toMatchInlineSnapshot(
      `"<h2 id="section" aria-label="Section">Section<a aria-label="Ссылка на этот раздел" class="ui-heading-anchor" data-pagefind-ignore="all" href="#section" title="Ссылка на этот раздел"><span aria-hidden="true">#</span></a></h2>"`
    );
    expect([...original.localIds]).toMatchInlineSnapshot(`
      [
        [
          "section",
          "section",
        ],
      ]
    `);
    expect(render('## Section', { idPrefix: '' })).toBe(original.html);
  });
});
