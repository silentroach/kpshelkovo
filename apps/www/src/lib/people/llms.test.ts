import { beforeAll, describe, expect, it, vi } from 'vitest';

const fixtures = vi.hoisted(() => ({
  people: {
    profiles: [
      {
        canonical: 'https://example.com/people/kschemelinin/',
        markdownUrl: '/people/kschemelinin/index.md',
        mentions: [{ type: 'place', slug: 'apple-garden' }],
        backlinks: {
          news: [{ sourceId: '2026/05/power-outage' }],
          status: [{ sourceId: '2026/04/electricity' }],
          reviews: [],
          places: [{ sourceId: 'titanic' }],
          people: [],
          contacts: [],
          discomfort: [],
        },
      },
    ],
  },
}));

vi.mock('./load', () => ({
  loadPeopleDataWithBacklinks: async () => fixtures.people,
}));

let build: typeof import('./llms').build;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ build } = await import('./llms'));
});

describe('people llms', () => {
  it('serializes the short agent overview as Markdown AST output', async () => {
    await expect(build('short')).resolves.toMatchInlineSnapshot(`
      "# Люди Шелково

      Файл: llms.txt
      Язык: русский

      ## Описание

      - Раздел \`/people/\` публикует публичные профили людей, контакты и граф упоминаний между новостями, статусом, отзывами, картой мест, «ОК Дискомфорт», другими профилями и сарафаном.
      - Сейчас в разделе 1 профиль, 1 исходящее упоминание и 3 обратные ссылки.
      - Публичного HTML-индекса \`/people/\` нет: для массового обхода используйте people.json и Markdown-обзор.
      - У профиля могут быть \`company\`, \`position\` и \`name_cases\` для склонения канонических упоминаний; \`body_markdown\` может быть пустым, если базовый контекст уже есть во frontmatter.

      ## Главные URL

      - Markdown-обзор раздела: <https://example.com/people/index.md>
      - Основная JSON-лента: <https://example.com/people/data/people.json>
      - Каталог API: <https://example.com/people/.well-known/api-catalog>
      - JSON Schema: <https://example.com/people/schemas/people.schema.json>
      - OpenAPI: <https://example.com/people/openapi/people.openapi.json>
      - Расширенная версия этого текста: <https://example.com/people/llms-full.txt>

      ## Как читать раздел

      - Для массового обхода начинайте с <https://example.com/people/data/people.json>.
      - Для одной персоны переходите на <https://example.com/people/kschemelinin/> или <https://example.com/people/kschemelinin/index.md>.
      - В \`mentions\` лежат исходящие упоминания людей и мест из body профиля; обязательное поле \`type\` различает \`person\` и \`place\`. Учитываются \`@slug\`, \`@slug:case\` и \`[текст](@slug)\`, а \`[текст](@slug:case)\` не поддерживается.
      - В \`backlinks\` лежат входящие ссылки из новостей, статуса, отзывов, карты мест, «ОК Дискомфорт», других профилей и сарафана, собранные из тех же канонических и подписанных синтаксисов упоминаний.
      - Контакты публикуются открыто и не маскируются в ленте или Markdown-версиях.
      "
    `);
  });

  it('documents the mention target discriminator in the full overview', async () => {
    await expect(build('full')).resolves.toContain(
      'обязательное поле `type` со значением `person` или `place`',
    );
  });
});
