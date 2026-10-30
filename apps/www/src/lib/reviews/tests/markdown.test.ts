import { parseMarkdownFragment } from '@shelkovo/markdown';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Review } from '../types';

let buildReviewMarkdown: typeof import('../markdown').buildReviewMarkdown;
let buildReviewsHomeMarkdown: typeof import('../markdown').buildReviewsHomeMarkdown;
let buildReviewsRulesMarkdown: typeof import('../markdown').buildReviewsRulesMarkdown;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-01T09:00:00Z'));
});
afterEach(() => vi.useRealTimers());

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/'
  });

  ({ buildReviewMarkdown, buildReviewsHomeMarkdown, buildReviewsRulesMarkdown } =
    await import('../markdown'));
});

const review = {
  id: '2026-06-25-life-in-shelkovo-forest',
  slug: 'life-in-shelkovo-forest',
  title: 'Год жизни в Шелково',
  author: 'Алексей',
  area: 'forest',
  publishedAt: new Date('2026-06-25T00:00:00.000Z'),
  publishedIso: '2026-06-25',
  url: '/reviews/2026-06-25-life-in-shelkovo-forest/',
  markdownUrl: '/reviews/2026-06-25-life-in-shelkovo-forest/index.md',
  canonical: 'https://example.com/reviews/2026-06-25-life-in-shelkovo-forest/',
  body: 'Основной текст отзыва.',
  aspects: [
    { type: 'management', body: 'Отвечают не всегда быстро.' },
    { type: 'place', rating: 5, body: 'Лес, пруды и тишина.' }
  ],
  mentions: []
} satisfies Review;

describe('reviews markdown companions', () => {
  it('keeps each selected quote with its attribution and full Markdown link', () => {
    const withExcerpt: Review = { ...review, excerpt: 'Цена < 5, условия *прежние*.' };
    const withoutExcerpt: Review = {
      ...review,
      id: '2026-06-25-anonymous',
      title: 'Другой отзыв',
      author: undefined,
      markdownUrl: '/reviews/2026-06-25-anonymous/index.md',
      seo: { description: 'Do not use this SEO fallback.' }
    };
    const markdown = buildReviewsHomeMarkdown({
      reviews: [withExcerpt, withoutExcerpt],
      byId: new Map()
    });
    const list = parseMarkdownFragment(markdown).find((node) => node.type === 'list');
    const quotedItem = list?.children[0];
    const plainItem = list?.children[1];

    expect(quotedItem?.children).toMatchObject([
      {
        type: 'paragraph',
        children: [
          { type: 'link', url: `https://example.com${review.markdownUrl}` },
          { type: 'text', value: ' — 25 июня; Алексей; Шелково Форест.' }
        ]
      },
      {
        type: 'blockquote',
        children: [{ type: 'paragraph', children: [{ type: 'text', value: withExcerpt.excerpt }] }]
      }
    ]);
    expect(plainItem?.children).toMatchObject([
      {
        type: 'paragraph',
        children: [
          { type: 'link', url: `https://example.com${withoutExcerpt.markdownUrl}` },
          { type: 'text', value: ' — 25 июня; Анонимный собственник; Шелково Форест.' }
        ]
      }
    ]);
    expect(markdown).not.toContain(withoutExcerpt.body);
    expect(markdown).not.toContain(withoutExcerpt.seo?.description);
  });

  it('does not replace or duplicate the full Markdown body with the list excerpt', () => {
    expect(buildReviewMarkdown({ ...review, excerpt: 'текст отзыва.' })).toBe(
      buildReviewMarkdown(review)
    );
  });

  it('renders empty launch home without internal paths', () => {
    const markdown = buildReviewsHomeMarkdown({ reviews: [], byId: new Map() });

    expect(markdown).toMatchInlineSnapshot(`
      "# Отзывы собственников Шелково

      Независимые отзывы текущих собственников Шелково. Тексты публикуются без редакторских правок, а авторы проходят ручную проверку перед публикацией.

      [Правила публикации отзывов](https://example.com/reviews/rules/index.md).

      ## Отзывы

      Если вы собственник участка или дома в Шелково, [посмотрите, как оставить свой отзыв](https://example.com/reviews/rules/index.md).
      "
    `);
  });

  it('renders rules markdown with Telegram and reaction channel', () => {
    const markdown = buildReviewsRulesMarkdown();

    expect(markdown).toMatchInlineSnapshot(`
      "# Правила публикации отзывов

      ## Кто может оставить отзыв

      Отзыв могут оставить текущие собственники участков или домов в Шелково.

      ## Как отправить отзыв

      Напишите в Telegram: [t.me/silentroach](https://t.me/silentroach). Для проверки владения могут понадобиться выписка из ЕГРН и скриншот из приложения Домиленд.

      Сайт не хранит документы проверки, контакты, черновики и внутренние заметки. Публикация отзыва означает, что автор прошел ручную проверку до публикации.

      ## Редактура

      Текст отзыва публикуется без редакторских правок. Если в тексте есть проблема, отзыв не публикуется до новой версии от автора.

      ## Почему отзыв могут не принять

      - не подтверждено владение;
      - спам;
      - угрозы;
      - незаконный контент;
      - чужие персональные данные;
      - серьезные обвинения вроде преступлений или мошенничества без фактов.

      ## Отказ от ответственности

      Отзывы — это авторские тексты собственников. Мнение автора может не совпадать с позицией владельца сайта. Ответственность за сведения, оценки и формулировки в отзыве несет автор в пределах закона. Владелец сайта не является автором отзыва, не редактирует текст и не подтверждает каждое фактическое утверждение, а только проверяет, что автор является текущим собственником участка или дома в Шелково.

      ## Если отзыв нарушает права

      Если вы считаете, что отзыв нарушает ваши права, содержит чужие персональные данные, угрозы или недостоверные сведения, напишите владельцу сайта со ссылкой на страницу и описанием проблемы. Мы рассмотрим обращение и при необходимости скроем или удалим материал.
      "
    `);
  });

  it('renders review detail markdown with frontmatter, body, and aspects', () => {
    const markdown = buildReviewMarkdown(review);

    expect(markdown).toMatchInlineSnapshot(`
      "---
      title: Год жизни в Шелково
      published_at: 2026-06-25
      author: Алексей
      area: Шелково Форест
      ratings:
        place: 5
      ---

      # Год жизни в Шелково

      25 июня; Алексей; Шелково Форест.

      Основной текст отзыва.

      ## Комментарии по темам

      ### Место и среда

      Лес, пруды и тишина.

      ### Обслуживание

      Отвечают не всегда быстро.

      ## Отказ от ответственности

      Отзывы — это авторские тексты собственников. Мнение автора может не совпадать с позицией владельца сайта. Ответственность за сведения, оценки и формулировки в отзыве несет автор в пределах закона. Владелец сайта не является автором отзыва, не редактирует текст и не подтверждает каждое фактическое утверждение, а только проверяет, что автор является текущим собственником участка или дома в Шелково.
      "
    `);
  });
});
