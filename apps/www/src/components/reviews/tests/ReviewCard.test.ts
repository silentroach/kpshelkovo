/// <reference types="astro/client" />

import { Window } from 'happy-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Review } from '@/lib/reviews/types';
import { visibleWhitespace } from '@/lib/test/visible-whitespace';
import { createAstroContainer } from '@/test/astro-container';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import ReviewCard from '../ReviewCard.astro';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-01T09:00:00Z'));
});
afterEach(() => vi.useRealTimers());

const review = {
  id: '2026-06-25-life-in-shelkovo-forest',
  slug: 'life-in-shelkovo-forest',
  area: 'forest',
  publishedAt: new Date('2026-06-25T00:00:00.000Z'),
  publishedIso: '2026-06-25',
  url: '/reviews/2026-06-25-life-in-shelkovo-forest/',
  markdownUrl: '/reviews/2026-06-25-life-in-shelkovo-forest/index.md',
  canonical: 'https://example.com/reviews/2026-06-25-life-in-shelkovo-forest/',
  body: 'Основной текст отзыва.',
  aspects: [
    { type: 'management', rating: 2 },
    { type: 'place', rating: 5 },
    { type: 'developer', rating: 3 }
  ],
  mentions: []
} satisfies Review;

const visibleText = (html: string): string =>
  html
    .replace(/<[^>]*>/gu, ' ')
    .replace(/&nbsp;|&#160;|&#xA0;/giu, '\u00A0')
    .replace(/[\t\n\r ]+/gu, ' ')
    .trim();

const ariaLabels = (html: string): readonly string[] =>
  [...html.matchAll(/aria-label="([^"]+)"/gu)].map((match) => match[1] ?? '');

describe('ReviewCard', () => {
  it('renders generated title, anonymous author, area, and aspect rating', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(ReviewCard, {
      props: { review }
    });

    expect({
      text: visibleWhitespace(visibleText(html)),
      datetime: html.match(/<time\b[^>]*datetime="([^"]+)"/u)?.[1],
      ariaLabels: ariaLabels(html),
      titles: [...html.matchAll(/ title="([^"]+)"/gu)].map((match) => match[1] ?? '')
    }).toMatchInlineSnapshot(`
      {
        "ariaLabels": [
          "Шелково Форест",
          "Оценка 5 из 5",
          "Оценка 3 из 5",
          "Оценка 2 из 5",
        ],
        "datetime": "2026-06-25",
        "text": "Отзыв собственника от 25 июня Анонимный собственник 25 июня Место и среда Застройщик Обслуживание",
        "titles": [
          "Шелково Форест",
          "Земля МО",
          "ОК Комфорт",
        ],
      }
    `);
  });

  it('keeps title, attribution, complete quoted text and ratings in DOM order', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(ReviewCard, {
      props: {
        review: {
          ...review,
          title: 'Личный опыт',
          author: 'Имя автора',
          excerpt: 'За сезон - только ремонт. <img src=x onerror=alert(1)> &copy; <b>текст</b>'
        }
      }
    });
    const document = new Window().document;
    document.body.innerHTML = html;
    const article = document.querySelector('article');

    expect(
      [...document.querySelectorAll('h3, time, blockquote, ul')].map((node) => node.tagName)
    ).toEqual(['H3', 'TIME', 'BLOCKQUOTE', 'UL']);
    expect({
      link: article?.querySelector('h3 a')?.getAttribute('href'),
      cite: article?.querySelector('blockquote')?.getAttribute('cite'),
      attribution: article?.querySelector('time')?.previousElementSibling?.textContent,
      quote: visibleWhitespace(article?.querySelector('blockquote')?.textContent.trim() ?? '')
    }).toMatchInlineSnapshot(`
      {
        "attribution": "Имя автора",
        "cite": "/reviews/2026-06-25-life-in-shelkovo-forest/",
        "link": "/reviews/2026-06-25-life-in-shelkovo-forest/",
        "quote": "За·сезон·— только ремонт. <img src=x onerror=alert(1)> &copy; <b>текст</b>",
      }
    `);
    expect(
      document.querySelectorAll('blockquote img, blockquote b, blockquote script')
    ).toHaveLength(0);
  });

  it.each([0, 1, 2, 3])(
    'renders only the %i rated themes, without empty blocks or fallback text',
    async (count) => {
      const container = await createAstroContainer();
      const html = await container.renderToString(ReviewCard, {
        props: {
          review: {
            ...review,
            seo: { description: 'Не подставлять описание.' },
            aspects: review.aspects.map((aspect, index) => ({
              type: aspect.type,
              rating: index < count ? aspect.rating : undefined,
              body: 'Текст темы без обязательной оценки.'
            }))
          }
        }
      });
      const document = new Window().document;
      document.body.innerHTML = html;
      const expected = [
        { label: 'Место и среда', rating: 'Оценка 5 из 5', filled: 5 },
        { label: 'Застройщик', rating: 'Оценка 3 из 5', filled: 3 },
        { label: 'Обслуживание', rating: 'Оценка 2 из 5', filled: 2 }
      ].filter((aspect) =>
        [2, 5, 3].slice(0, count).some((rating) => aspect.rating === `Оценка ${rating} из 5`)
      );

      expect(
        [...document.querySelectorAll('li')].map((item) => ({
          label: item.querySelector('span')?.textContent.trim(),
          rating: item.querySelector('[role="img"]')?.getAttribute('aria-label'),
          filled: item.querySelectorAll('svg.star-rating__star--filled').length
        }))
      ).toEqual(expected);
      expect(document.querySelectorAll('ul')).toHaveLength(count ? 1 : 0);
      expect(document.querySelectorAll('blockquote')).toHaveLength(0);
      expect(html).not.toContain('Не подставлять описание.');
      expect(html).not.toContain(review.body);
    }
  );

  it('ends with the excerpt when there are no ratings', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(ReviewCard, {
      props: { review: { ...review, excerpt: 'Личный опыт.', aspects: [] } }
    });
    const document = new Window().document;
    document.body.innerHTML = html;

    expect(document.querySelector('blockquote')?.nextElementSibling).toBeFalsy();
    expect(document.querySelectorAll('ul')).toHaveLength(0);
    expect(visibleText(html)).toContain('Анонимный собственник');
  });
});
