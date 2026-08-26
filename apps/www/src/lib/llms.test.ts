import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { PublicSurfaceId } from './public-surface';

const fixtures = vi.hoisted(() => ({
  meetings: [
    {
      slug: '2026-06-13-ok-comfort',
      url: '/meetings/2026-06-13-ok-comfort/',
      transcript: {
        parts: [{ index: 1 }],
      },
    },
  ],
  news: {
    articles: [{ id: 'news-1' }, { id: 'news-2' }, { id: 'news-3' }],
  },
  reviews: {
    reviews: [{ id: 'review-1' }, { id: 'review-2' }],
  },
  contacts: {
    contacts: [{ slug: 'contact-1' }],
  },
  people: {
    profiles: [
      {
        canonical: 'https://example.com/people/kschemelinin/',
        markdownUrl: '/people/kschemelinin/index.md',
      },
    ],
  },
  places: [{ slug: 'burzhuyka' }],
  status: {
    incidents: [{ id: 'status-1' }, { id: 'status-2' }],
    active: [{ kind: 'incident' }, { kind: 'maintenance' }],
  },
}));

vi.mock('./meetings/load', () => ({
  loadMeetings: async () => fixtures.meetings,
}));

vi.mock('./news/load', () => ({
  loadNewsData: async () => fixtures.news,
}));

vi.mock('./reviews/load', () => ({
  loadReviewsData: async () => fixtures.reviews,
}));

vi.mock('./contacts/load', () => ({
  loadContactsData: async () => fixtures.contacts,
}));

vi.mock('./people/load', () => ({
  loadPeopleDataWithBacklinks: async () => fixtures.people,
}));

vi.mock('./places/load', () => ({
  loadPlaces: async () => fixtures.places,
}));

vi.mock('./status/load', () => ({
  loadStatusData: async () => fixtures.status,
}));

let build: typeof import('./llms').build;
let buildHomeMarkdown: typeof import('./llms').buildHomeMarkdown;
let publicSurfaceRegistry: typeof import('./public-surface').publicSurfaceRegistry;
let surfaceHref: typeof import('./public-surface').surfaceHref;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ build, buildHomeMarkdown } = await import('./llms'));
  ({ publicSurfaceRegistry, surfaceHref } = await import('./public-surface'));
});

describe('root llms', () => {
  it('serializes the short agent overview as Markdown AST output', async () => {
    await expect(build('short')).resolves.toMatchInlineSnapshot(`
      "# Шелково Онлайн

      Файл: llms.txt
      Язык: русский

      ## Описание

      - Это карта публичных данных и точек входа kpshelkovo.online.
      - Основные разделы: новости, статус сервисов, карта мест, отзывы собственников, сарафан, архив встреч, регламент и смета тарифа 815, профили людей и сравнение тарифов поселков.
      - Сейчас в новостях 3 статьи, в статусе 2 записи и 1 активный инцидент, на карте 1 место, в сарафане 1 контакт, в отзывах 2 отзыва, в архиве встреч 1 встреча, в людях 1 профиль.
      - Для массового чтения используйте JSON-ленты там, где они есть; HTML и Markdown удобнее для ссылок и точечного чтения.

      ## Главные URL

      - Главная: <https://example.com/>
      - Главная в Markdown: <https://example.com/index.md>
      - Каталог API сайта: <https://example.com/.well-known/api-catalog>
      - Инструкции для автоматического чтения сайта: <https://example.com/.well-known/agent-skills/index.json>
      - Новости: <https://example.com/news/>
      - Статус: <https://example.com/status/>
      - Карта мест: <https://example.com/map/>
      - Отзывы: <https://example.com/reviews/>
      - Сарафан: <https://example.com/sarafan/>
      - Архив встреч в Markdown: <https://example.com/meetings/index.md>
      - Регламент: <https://example.com/815/regulation/>
      - Люди в Markdown: <https://example.com/people/index.md>
      - Сравнение тарифов: <https://example.com/815/compare/>
      - Расширенная версия этого текста: <https://example.com/llms-full.txt>

      ## Как ориентироваться

      - Если задача относится к одному разделу, сначала откройте его \`llms.txt\` или Markdown-индекс; если нужны данные массово, сразу берите JSON-ленту там, где она есть.
      - Новости: <https://example.com/news/llms.txt>; основная лента: <https://example.com/news/data/articles.json>; календарные события лежат в \`articles[].events[].ics_url\`.
      - Статус сервисов: <https://example.com/status/llms.txt>; основная лента: <https://example.com/status/data/status.json>.
      - Карта мест: <https://example.com/map/index.md>; облегчённые данные маркеров и геометрии: <https://example.com/map/data/places.json>; карточки: \`/map/[slug]/\` и \`/map/[slug]/index.md\`, включая входящие ссылки на материалы, где упомянуто место.
      - Отзывы собственников: <https://example.com/reviews/index.md>; правила публикации: <https://example.com/reviews/rules/index.md>; детальные страницы: \`/reviews/[id]/\` и \`/reviews/[id]/index.md\`.
      - Сарафан: <https://example.com/sarafan/index.md>; разделы: \`/sarafan/[category]/\` и \`/sarafan/[category]/index.md\`; детальные страницы есть только у контактов с body и используют \`/sarafan/[category]/[slug]/\` и \`/sarafan/[category]/[slug]/index.md\`; если для контакта доступна vCard, ее адрес указан в \`vcf_url\`.
      - Архив встреч: <https://example.com/meetings/index.md>; одна встреча: <https://example.com/meetings/2026-06-13-ok-comfort/> или <https://example.com/meetings/2026-06-13-ok-comfort/index.md>; полный текст транскрипта берите по частям, например <https://example.com/meetings/2026-06-13-ok-comfort/transcript/1.md>.
      - Регламент и смета: <https://example.com/815/regulation/llms.txt>; смета: <https://example.com/815/regulation/data/estimate-2026.json>; полный регламент: <https://example.com/815/regulation/full.md>; набор данных: <https://example.com/815/regulation/data/full-2026.json>.
      - Люди: <https://example.com/people/llms.txt>; основная лента: <https://example.com/people/data/people.json>; одна персона: <https://example.com/people/kschemelinin/> или <https://example.com/people/kschemelinin/index.md>.
      - Сравнение тарифов поселков: <https://example.com/815/compare/llms.txt>; основная лента: <https://example.com/815/compare/data/settlements.json>.
      - Публичные инструкции помогают с типовыми задачами; у сравнения тарифов есть отдельный индекс.
      "
    `);
  });

  it('publishes public discovery endpoints without relying on section copy', async () => {
    const short = await build('short');
    const full = await build('full');
    const home = await buildHomeMarkdown();
    const combined = [short, full, home].join('\n');

    for (const url of [
      'https://example.com/.well-known/api-catalog',
      'https://example.com/.well-known/agent-skills/index.json',
      'https://example.com/news/llms.txt',
      'https://example.com/news/data/articles.json',
      'https://example.com/status/llms.txt',
      'https://example.com/status/data/status.json',
      'https://example.com/map/',
      'https://example.com/map/index.md',
      'https://example.com/map/data/places.json',
      'https://example.com/reviews/',
      'https://example.com/reviews/index.md',
      'https://example.com/reviews/rules/index.md',
      'https://example.com/sarafan/',
      'https://example.com/sarafan/index.md',
      'https://example.com/meetings/index.md',
      'https://example.com/meetings/2026-06-13-ok-comfort/',
      'https://example.com/meetings/2026-06-13-ok-comfort/index.md',
      'https://example.com/meetings/2026-06-13-ok-comfort/transcript/1.md',
      'https://example.com/815/regulation/llms.txt',
      'https://example.com/815/regulation/data/estimate-2026.json',
      'https://example.com/815/regulation/data/full-2026.json',
      'https://example.com/people/llms.txt',
      'https://example.com/people/data/people.json',
      'https://example.com/people/kschemelinin/',
      'https://example.com/people/kschemelinin/index.md',
      'https://example.com/815/compare/llms.txt',
      'https://example.com/815/compare/data/settlements.json',
    ]) {
      expect(combined).toContain(url);
    }

    expect(combined).not.toMatch(/apps\/www|src\/|repo:/u);
    expect(combined).not.toContain('/sarafan/llms.txt');
    expect(combined).not.toContain('/sarafan/llms-full.txt');
  });

  it('uses registered public surfaces for the root URL map', async () => {
    const root = 'https://example.com';
    const combined = [
      await build('short'),
      await build('full'),
      await buildHomeMarkdown(),
    ].join('\n');

    const registeredUrls = [
      'root:api-catalog',
      'root:llms',
      'root:llms-full',
      'root:skills',
      'news:index',
      'news:llms',
      'news:data',
      'status:index',
      'status:llms',
      'status:data',
      'places:index',
      'places:index-markdown',
      'reviews:index',
      'reviews:index-markdown',
      'reviews:rules-markdown',
      'contacts:index',
      'contacts:index-markdown',
      'meetings:index-markdown',
      'reglament:index',
      'reglament:llms',
      'reglament:data-estimate-2026',
      'reglament:data-full-2026',
      'people:index-markdown',
      'people:llms',
      'people:data',
      'compare:index',
      'compare:index-markdown',
      'compare:llms',
      'compare:data-settlements',
      'compare:api-catalog',
      'compare:skills',
    ] satisfies readonly PublicSurfaceId[];

    for (const surfaceId of registeredUrls) {
      const surface = publicSurfaceRegistry.surfaces.find(
        (item) => item.id === surfaceId,
      );

      expect(surface, surfaceId).toBeDefined();
      if (!surface) {
        throw new Error(`Missing registered surface ${surfaceId}`);
      }

      expect(combined).toContain(surfaceHref(root, surface));
    }
  });

  it('does not keep Compare public URLs as root llms literals', async () => {
    const sourcePath = fileURLToPath(new URL('./llms.ts', import.meta.url));
    const source = await readFile(sourcePath, 'utf8');

    expect(source).not.toContain('/815/compare');
  });
});
