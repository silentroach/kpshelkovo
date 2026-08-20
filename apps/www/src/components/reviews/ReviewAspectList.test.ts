/// <reference types="astro/client" />

import { describe, expect, it } from 'vitest';

import { createAstroContainer } from '@/test/astro-container';
import type { ReviewAspect } from '@/lib/reviews/types';
import { visibleWhitespace } from '@/lib/test/visible-whitespace';

// @ts-expect-error Astro component modules are resolved by Astro/Vitest at test time.
import ReviewAspectList from './ReviewAspectList.astro';

const aspects: readonly ReviewAspect[] = [
  { type: 'management', body: 'Отвечают не всегда быстро.' },
  { type: 'place', rating: 5 },
  { type: 'developer', rating: 3, body: 'Есть нейтральные впечатления.' },
];

const visibleText = (html: string): string =>
  html
    .replace(/<[^>]*>/gu, ' ')
    .replace(/&nbsp;|&#160;|&#xA0;/giu, '\u00A0')
    .replace(/[\t\n\r ]+/gu, ' ')
    .trim();

const ariaLabels = (html: string): readonly string[] =>
  [...html.matchAll(/aria-label="([^"]+)"/gu)].map((match) => match[1] ?? '');

describe('ReviewAspectList', () => {
  it('renders aspects in fixed order with independent rating and body', async () => {
    const container = await createAstroContainer();
    const html = await container.renderToString(ReviewAspectList, {
      props: { aspects },
    });

    expect({
      text: visibleWhitespace(visibleText(html)),
      ariaLabels: ariaLabels(html),
      titles: [...html.matchAll(/ title="([^"]+)"/gu)].map(
        (match) => match[1] ?? '',
      ),
    }).toMatchInlineSnapshot(`
      {
        "ariaLabels": [
          "Оценка 5 из 5",
          "Оценка 3 из 5",
        ],
        "text": "Оценки по темам Место и среда Застройщик Есть нейтральные впечатления. Обслуживание Отвечают не·всегда быстро.",
        "titles": [
          "Земля МО",
          "ОК Комфорт",
        ],
      }
    `);
  });
});
