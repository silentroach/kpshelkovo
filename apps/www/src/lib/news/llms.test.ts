import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./load', () => {
  const news = {
    articles: [
      {
        canonical: 'https://example.com/news/2026/05/event/',
        markdownUrl: '/news/2026/05/event/index.md',
      },
    ],
    archives: {
      years: [
        {
          url: '/news/2026/',
          months: [{ url: '/news/2026/05/' }],
        },
      ],
    },
    tags: [{ url: '/news/tags/electricity/' }],
  };

  return {
    loadNewsData: async () => news,
  };
});

let build: typeof import('./llms').build;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ build } = await import('./llms'));
});

describe('news llms', () => {
  it('serializes the short agent overview as Markdown AST output', async () => {
    await expect(build('short')).resolves.toMatchInlineSnapshot(`
      "# Новости Шелково

      Файл: llms.txt
      Язык: русский

      ## Описание

      - Раздел \`/news/\` публикует новости и объявления по КП Шелково.
      - Сейчас в разделе 1 статья, 1 тег и 1 архивный год.
      - HTML-страницы новостей остаются каноническим представлением для людей, а \`articles.json\` служит основным структурированным файлом данных.
      - Если новость объявляет календарные события, в \`articles[].events[]\` есть метаданные событий и ссылки на локальные для статьи \`.ics\`-файлы.

      ## Главные URL

      - Главная новостей: <https://example.com/news/>
      - Основной JSON-файл: <https://example.com/news/data/articles.json>
      - RSS: <https://example.com/news/feed.xml>
      - Каталог API: <https://example.com/news/.well-known/api-catalog>
      - JSON Schema: <https://example.com/news/schemas/articles.schema.json>
      - OpenAPI: <https://example.com/news/openapi/articles.openapi.json>
      - Расширенная версия этого текста: <https://example.com/news/llms-full.txt>

      ## Как читать раздел

      - Пример HTML-страницы новости: <https://example.com/news/2026/05/event/>
      - Пример Markdown-страницы новости: <https://example.com/news/2026/05/event/index.md>
      - Архив новостей по годам: <https://example.com/news/archive/>
      - Годовой архив: <https://example.com/news/2026/>
      - Месячный архив: <https://example.com/news/2026/05/>
      - Индекс тегов: <https://example.com/news/tags/>
      - Пример страницы тега: <https://example.com/news/tags/electricity/>
      - В корне \`articles.json\` есть \`schema_version\`, \`generated_at\`, \`updated_at\`, \`total_count\`, а также массивы \`articles\`, \`archives.years\` и \`tags\`.
      - В \`articles.json\` каждая статья содержит \`summary\`, полный \`body_markdown\` и необязательный массив \`events\`.
      - Тип источника определяется по \`author.kind\`; официальные источники используют \`kind: official\`.
      - Для календаря события используйте \`/news/YYYY/MM/[entry]/[event-slug].ics\`; глобального календаря событий нет.
      "
    `);
  });
});
