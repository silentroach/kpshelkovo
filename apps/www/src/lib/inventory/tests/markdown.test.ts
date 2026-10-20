import { render } from '@shelkovo/markdown';
import { Window } from 'happy-dom';
import { describe, expect, it } from 'vitest';

import { renderMarkdownWithMetadata } from '@/lib/markdown/render';

import { buildInventoryDataset } from '../load';
import {
  buildInventoryGroupMarkdown,
  buildInventoryHomeMarkdown,
  buildInventoryKindMarkdown,
  buildInventoryOfferMarkdown
} from '../markdown';
import { kindEntry, offerEntry, ownerEntry, parcels } from './fixtures';

const document = new Window().document;

const repeatedBody = (id: string): string => `[TOC]

## Shared

Текст ${id}. [Локально](#shared) [Encoded](#%73hared) [Контейнер](/ukogo/construction/grinder/#offer-first).
[Справка](/kb/tool/) [Источник][source] [Раздел по определению][local].

### Detail

## Shared

Сноска ${id}[^Note] и повтор[^Note].

[^Note]: Примечание ${id} с [источником][source].

[source]: https://example.com/${id}
[local]: #shared-2
`;

describe('inventory Markdown companions', () => {
  it('links each independent body TOC to its actual authored HTML headings, not GFM labels or nested headings', () => {
    const body = `[TOC]

## Footnote label

## user-content-fn-note

## user-content-fnref-note

> ## Shared

## Shared

## :toc-omit[Appendix] Terms

[Footnote section](#footnote-label) and text[^note].

[^note]: A note.
`;
    const data = buildInventoryDataset(
      {
        owners: [ownerEntry()],
        kinds: [kindEntry('grinder', undefined, '')],
        offers: [offerEntry('first', undefined, body), offerEntry('second', undefined, body)]
      },
      { parcels }
    );
    const kind = data.byKind.get('grinder')!;
    for (const offer of kind.offers) {
      document.body.innerHTML = render(buildInventoryOfferMarkdown(offer));
      const htmlDocument = new Window().document;
      const rendered = renderMarkdownWithMetadata(offer.body, { idPrefix: offer.bodyIdPrefix });
      htmlDocument.body.innerHTML = rendered.html;
      const authoredTocTargets = [...htmlDocument.querySelectorAll('nav a')].map((link) => {
        const href = decodeURIComponent(link.getAttribute('href')!);
        const heading = htmlDocument.getElementById(href.slice(1));
        expect(heading?.tagName).toBe('H2');
        expect(heading?.closest('[data-footnotes], blockquote')).toBeFalsy();
        return `${offer.canonical}${href}`;
      });
      expect(authoredTocTargets).toHaveLength(5);
      const companionTocTargets = [...document.querySelectorAll('body > ul a')]
        .map((link) => decodeURIComponent(link.getAttribute('href')!))
        .filter((href) => href.startsWith(`${offer.canonical}#${offer.bodyIdPrefix}`));
      expect(companionTocTargets).toEqual(authoredTocTargets);
      expect(rendered.localIds.get('footnote-label')).toBe(`${offer.bodyIdPrefix}footnote-label`);
      const originalFootnoteLink = [...document.querySelectorAll('a')].find(
        (link) =>
          link.textContent === 'Footnote section' &&
          link.getAttribute('href') === `${offer.canonical}#${offer.bodyIdPrefix}footnote-label`
      );
      expect(originalFootnoteLink).toBeTruthy();
    }
  });

  it('links the nonempty contents to group/kind companions and invites only at the root', () => {
    const data = buildInventoryDataset(
      {
        owners: [ownerEntry()],
        kinds: [kindEntry(), kindEntry('vacuum', { title: 'Пылесос', group: 'home' })],
        offers: [offerEntry()]
      },
      { parcels }
    );
    const markdown = buildInventoryHomeMarkdown(data);
    document.body.innerHTML = render(markdown);
    expect(
      [...document.querySelectorAll('a:not(.ui-heading-anchor)')].map((a) => a.getAttribute('href'))
    ).toMatchInlineSnapshot(`
        [
          "https://t.me/silentroach",
          "https://kpshelkovo.online/ukogo/construction/index.md",
          "https://kpshelkovo.online/ukogo/construction/grinder/index.md",
        ]
      `);
    expect(document.body.textContent).toContain('1 предложение');
    expect(markdown).not.toContain('/home/');
    const group = data.byGroup.get('construction')!;
    const groupMarkdown = buildInventoryGroupMarkdown(group);
    expect(groupMarkdown).toContain('/ukogo/index.md');
    expect(groupMarkdown).toContain('/construction/grinder/index.md');
    expect(groupMarkdown).not.toContain('https://t.me/silentroach');
    expect(buildInventoryKindMarkdown(data.byKind.get('grinder')!)).not.toContain(
      'https://t.me/silentroach'
    );
  });

  it('keeps each body TOC and fragments on its canonical HTML and footnotes within its companion', () => {
    const data = buildInventoryDataset(
      {
        owners: [ownerEntry()],
        kinds: [kindEntry('grinder', undefined, repeatedBody('kind'))],
        offers: [
          offerEntry('first', undefined, repeatedBody('first')),
          offerEntry('second', undefined, repeatedBody('second'))
        ]
      },
      { parcels }
    );
    const kind = data.byKind.get('grinder')!;
    for (const { body, markdown } of [
      { body: kind, markdown: buildInventoryKindMarkdown(kind) },
      ...kind.offers.map((offer) => ({ body: offer, markdown: buildInventoryOfferMarkdown(offer) }))
    ]) {
      expect(markdown).not.toContain('[TOC]');
      expect(markdown.match(/\*\*Содержание\*\*/gu)).toHaveLength(1);
      document.body.innerHTML = render(markdown);
      const id = body === kind ? 'kind' : body.id;
      expect(document.body.textContent).toContain(`Текст ${id}.`);
      expect(document.body.textContent).toContain(`Примечание ${id}`);
      const localLinks = [...document.querySelectorAll('a[href]')].filter((a) =>
        a.getAttribute('href')?.startsWith(`${body.canonical}#${body.bodyIdPrefix}`)
      );
      expect(
        localLinks.map((a) =>
          decodeURIComponent(a.getAttribute('href')!).slice(
            `${body.canonical}#${body.bodyIdPrefix}`.length
          )
        )
      ).toMatchInlineSnapshot(`
          [
            "shared",
            "detail",
            "shared-2",
            "shared",
            "shared",
            "shared-2",
          ]
        `);
      expect(document.querySelectorAll(`a[href="https://example.com/${id}"]`)).toHaveLength(2);
      expect(markdown).toContain('[^Note]:');
      expect(
        document.querySelector('a[href="/ukogo/construction/grinder/#offer-first"]')
      ).toBeTruthy();
      expect(document.querySelectorAll('a[href="/kb/tool/"]')).toHaveLength(1);
      expect(document.querySelectorAll('[data-footnote-ref]')).toHaveLength(2);
      expect(document.querySelectorAll('[data-footnotes] li[id]')).toHaveLength(1);
      for (const link of document.querySelectorAll(
        'a[data-footnote-ref], a[data-footnote-backref]'
      )) {
        const target = decodeURIComponent(link.getAttribute('href')!.slice(1));
        expect(document.getElementById(target)).toBeTruthy();
      }
      for (const other of [kind, ...kind.offers].filter((item) => item !== body)) {
        expect(document.body.textContent).not.toContain(
          `Текст ${other === kind ? 'kind' : other.id}.`
        );
      }
    }
  });

  it('preserves all price variants, owner contacts, parcel and photo alternatives/captions', () => {
    const photoUrl = 'https://media.kpshelkovo.online/ukogo/fixed/tool.jpeg';
    const data = buildInventoryDataset(
      {
        owners: [
          ownerEntry('anna', {
            contacts: {
              phone: '123 доб. 4',
              telegram: 'https://t.me/example',
              whatsapp: 'https://wa.me/79000000000',
              email: 'anna@example.com',
              website: 'https://example.com/'
            }
          })
        ],
        kinds: [kindEntry()],
        offers: [
          offerEntry('free', { price: 0 }),
          offerEntry('fixed', {
            price: { value: 350, period: 'day' },
            photos: [
              {
                url: photoUrl,
                width: 1200,
                height: 800,
                alt: 'Комплект дисков',
                caption: 'Два **диска** [в комплекте].'
              },
              {
                url: 'https://media.kpshelkovo.online/ukogo/fixed/case.jpeg',
                width: 800,
                height: 1200,
                alt: 'Кейс'
              }
            ]
          }),
          offerEntry('negotiable')
        ]
      },
      { parcels }
    );
    const kind = data.byKind.get('grinder')!;
    const markdown = buildInventoryKindMarkdown(kind);
    document.body.innerHTML = render(markdown);
    const text = document.body.textContent.replace(/[\u00a0\u202f]/gu, ' ');
    expect(
      ['Бесплатно', '350 ₽/сутки', 'Цена по договорённости'].every((price) => text.includes(price))
    ).toBe(true);
    expect([...document.querySelectorAll('a[href^="tel:"]')]).toHaveLength(0);
    expect(document.body.textContent).toContain('Телефон: 123 доб. 4');
    expect(
      [...document.querySelectorAll('a[href]')].filter((a) =>
        [
          'https://t.me/example',
          'https://wa.me/79000000000',
          'mailto:anna@example.com',
          'https://example.com/'
        ].includes(a.getAttribute('href')!)
      )
    ).toHaveLength(12);
    expect(
      document.querySelectorAll('a[href="https://kpshelkovo.online/map/?p=SHR-L43"]')
    ).toHaveLength(3);
    expect([...document.querySelectorAll('img')].map((image) => image.getAttribute('src'))).toEqual(
      [photoUrl]
    );
    expect(document.querySelector('img')?.parentElement?.getAttribute('href')).toBe(
      'https://kpshelkovo.online/ukogo/construction/grinder/fixed/index.md'
    );
    expect(
      kind.offers.every((offer) =>
        markdown.includes(`https://kpshelkovo.online${offer.markdownUrl}`)
      )
    ).toBe(true);
    const expectedPrices = new Map([
      ['free', 'Бесплатно'],
      ['fixed', '350 ₽/сутки'],
      ['negotiable', 'Цена по договорённости']
    ]);
    for (const offer of kind.offers) {
      const detail = buildInventoryOfferMarkdown(offer);
      document.body.innerHTML = render(detail);
      const detailText = document.body.textContent.replace(/[\u00a0\u202f]/gu, ' ');
      expect(detailText).toContain(offer.summary);
      expect(detailText).toContain(expectedPrices.get(offer.id)!);
      expect(
        document.querySelector('a[href="https://kpshelkovo.online/map/?p=SHR-L43"]')
      ).toBeTruthy();
      expect(document.body.textContent).toContain('Телефон: 123 доб. 4');
      expect(document.querySelector('a[href^="tel:"]')).toBeFalsy();
      expect(detail).toContain(offer.canonical);
      expect(detail).toContain(`https://kpshelkovo.online${offer.listingUrl}`);
      expect(detail).not.toContain('https://t.me/silentroach');
    }
    document.body.innerHTML = render(
      buildInventoryOfferMarkdown(kind.offers.find((offer) => offer.id === 'fixed')!)
    );
    expect(
      [...document.querySelectorAll('img')].map((image) => [
        image.getAttribute('src'),
        image.getAttribute('alt')
      ])
    ).toMatchInlineSnapshot(`
        [
          [
            "https://media.kpshelkovo.online/ukogo/fixed/tool.jpeg",
            "Комплект дисков",
          ],
          [
            "https://media.kpshelkovo.online/ukogo/fixed/case.jpeg",
            "Кейс",
          ],
        ]
      `);
    expect(document.body.textContent).toContain('Два **диска** [в комплекте].');
  });

  it('keeps body and return links when the last offer is removed, and the root invitation when empty', () => {
    const data = buildInventoryDataset(
      {
        owners: [],
        kinds: [kindEntry('grinder', undefined, 'Ручной текст [справки](/kb/tool/).')],
        offers: []
      },
      { parcels }
    );
    const home = buildInventoryHomeMarkdown(data);
    const group = buildInventoryGroupMarkdown(data.byGroup.get('construction')!);
    const kind = buildInventoryKindMarkdown(data.byKind.get('grinder')!);
    expect(home).toContain('https://t.me/silentroach');
    for (const markdown of [group, kind]) {
      expect(markdown).toContain('Пока нет предложений.');
      expect(markdown).toContain('/ukogo/index.md');
    }
    expect(kind).toContain('Ручной текст [справки](/kb/tool/).');
    expect(group).not.toContain('/grinder/');
    expect(home).not.toContain('/construction/');
  });
});
