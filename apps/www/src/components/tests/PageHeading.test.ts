/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';

import type { PageHeadingProps } from '../page-heading.types';
// @ts-expect-error Astro modules are resolved by Astro/Vitest at test time.
import PageHeading from '../PageHeading.astro';
// @ts-expect-error Astro modules are resolved by Astro/Vitest at test time.
import EmptyHeadingSlots from './fixtures/EmptyHeadingSlots.astro';

const windows: Window[] = [];
afterEach(async () => {
  await Promise.all(windows.splice(0).map((window) => window.happyDOM.close()));
});

const renderHeading = async (props: PageHeadingProps, slots?: Readonly<Record<string, string>>) => {
  const container = await createAstroContainer();
  const html = await container.renderToString(PageHeading, { props: { ...props }, slots });
  const window = new Window();
  windows.push(window);
  window.document.body.innerHTML = html;
  return window.document;
};

describe('PageHeading', () => {
  it('keeps actions outside the H1 and preserves heading attributes and named navigation', async () => {
    const document = await renderHeading(
      {
        title: 'Встреча жителей',
        class: 'page-grid-item',
        headingAttributes: {
          id: 'event-title',
          'data-status': 'cancelled',
          'data-pagefind-meta': 'title',
          'aria-describedby': 'event-summary'
        }
      },
      { actions: '<nav aria-label="Переходы"><a href="/map/">Карта</a></nav>' }
    );
    const heading = document.querySelector('h1');
    expect({
      count: document.querySelectorAll('h1').length,
      name: heading?.textContent,
      id: heading?.id,
      status: heading?.getAttribute('data-status'),
      indexTitle: heading?.getAttribute('data-pagefind-meta'),
      describedBy: heading?.getAttribute('aria-describedby'),
      nestedActions: heading?.querySelectorAll('a, button, nav').length,
      nextElement: heading?.nextElementSibling?.querySelector('nav')?.getAttribute('aria-label')
    }).toMatchInlineSnapshot(`
      {
        "count": 1,
        "describedBy": "event-summary",
        "id": "event-title",
        "indexTitle": "title",
        "name": "Встреча жителей",
        "nestedActions": 0,
        "nextElement": "Переходы",
        "status": "cancelled",
      }
    `);
    expect(document.querySelector('.page-grid-item')).toBeTruthy();
  });

  it('formats raw title text without treating literal tags or entities as HTML', async () => {
    const document = await renderHeading({
      title: '"Встреча" 12-14 ноября <em>текст</em> &copy;'
    });
    const heading = document.querySelector('h1');
    expect({
      text: heading?.textContent.replaceAll('\u00a0', '·'),
      range: heading?.querySelector('.nowrap-date-range')?.textContent.replaceAll('\u00a0', '·'),
      literalElements: heading?.querySelectorAll('em').length,
      ranges: heading?.querySelectorAll('.nowrap-date-range').length
    }).toMatchInlineSnapshot(`
      {
        "literalElements": 0,
        "range": "12–14·ноября",
        "ranges": 1,
        "text": "«Встреча» 12–14·ноября <em>текст</em> &copy;",
      }
    `);
  });

  it.each([undefined, '', ' \n\t '])('omits absent or empty slots (%s)', async (content) => {
    const document = await renderHeading(
      { title: 'Название' },
      content === undefined ? undefined : { actions: content, subtitle: content }
    );
    expect({
      headings: document.querySelectorAll('h1').length,
      actions: document.querySelectorAll('.page-heading-actions').length,
      subtitles: document.querySelectorAll('.page-heading-subtitle').length
    }).toMatchInlineSnapshot(`
      {
        "actions": 0,
        "headings": 1,
        "subtitles": 0,
      }
    `);
  });

  it('omits wrappers when declared Astro slots render no conditional content', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(EmptyHeadingSlots);
    expect(html).not.toContain('page-heading-actions');
    expect(html).not.toContain('page-heading-subtitle');
  });

  it('keeps multiple subtitle paragraphs, links and emphasis without reformatting the slot', async () => {
    const document = await renderHeading(
      {
        title: 'Название',
        subtitleAttributes: { id: 'intro', 'data-pagefind-body': true }
      },
      {
        subtitle:
          '<p>Первый <strong>абзац</strong>.</p><p><a href="/details/">"Подробности"</a></p>'
      }
    );
    const subtitle = document.querySelector('#intro');
    expect({
      paragraphs: [...(subtitle?.querySelectorAll(':scope > p') ?? [])].map((p) => p.textContent),
      nestedParagraphs: subtitle?.querySelectorAll('p p').length,
      href: subtitle?.querySelector('a')?.getAttribute('href'),
      emphasis: subtitle?.querySelector('strong')?.textContent,
      searchable: subtitle?.hasAttribute('data-pagefind-body'),
      followsHeading: subtitle?.previousElementSibling?.querySelector('h1')?.textContent
    }).toMatchInlineSnapshot(`
      {
        "emphasis": "абзац",
        "followsHeading": "Название",
        "href": "/details/",
        "nestedParagraphs": 0,
        "paragraphs": [
          "Первый абзац.",
          ""Подробности"",
        ],
        "searchable": true,
      }
    `);
  });
});
