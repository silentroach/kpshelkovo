import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('./data', () => ({
  loadAllData: async () => {
    const settlements = [
      { isBaseline: true, shortName: 'Шелково', slug: 'shelkovo' },
      { isBaseline: false, shortName: 'Гринвуд', slug: 'greenwood' },
      { isBaseline: false, shortName: 'Белый парк', slug: 'white-park' },
    ];

    return {
      ratings: new Map([
        ['greenwood', { score: 71 }],
        ['white-park', { score: 84 }],
      ]),
      settlements,
      baseline: settlements[0],
      stats: { totalSettlements: 3 },
    };
  },
}));

let build: typeof import('./llms').build;

beforeAll(async () => {
  Object.assign(import.meta.env, {
    SITE: 'https://example.com',
    BASE_URL: '/',
  });

  ({ build } = await import('./llms'));
});

describe('compare llms', () => {
  it('serializes the short agent overview as Markdown AST output', async () => {
    await expect(build('short')).resolves.toMatchInlineSnapshot(`
      "# Сравнение тарифов поселков

      Файл: llms.txt
      Язык: русский

      ## Описание

      - Раздел \`/815/compare/\` сравнивает тарифы на содержание коттеджных поселков с тарифом КП Шелково.
      - В данных есть тарифы, базовая инфраструктура, общественные пространства, сервисная модель и условный рейтинг качества среды.
      - Сейчас в базе 3 поселка.

      ## Главные URL

      - Главная: <https://example.com/815/compare/>
      - Методика рейтинга: <https://example.com/815/compare/rating/>
      - Основная JSON-лента: <https://example.com/815/compare/data/settlements.json>
      - Облегченная лента explorer: <https://example.com/815/compare/data/explorer.json>
      - Индекс инструкций для автоматического чтения: <https://example.com/815/compare/.well-known/agent-skills/index.json>
      - Расширенная версия этого текста: <https://example.com/815/compare/llms-full.txt>
      - Примеры детальных страниц:
      - Шелково: <https://example.com/815/compare/settlements/shelkovo/>
      - Белый парк: <https://example.com/815/compare/settlements/white-park/>
      - Гринвуд: <https://example.com/815/compare/settlements/greenwood/>

      ## Что открывать первым

      - Для анализа всех поселков используйте \`data/settlements.json\`.
      - \`data/explorer.json\` нужен только для облегченного списка, карты и минимального набора данных.
      - Список \`sources\` остается на детальных страницах и не входит в общую ленту.
      - Если нужен первоисточник или человекочитаемый контекст, переходите на \`/settlements/[slug]/\`.

      ## Ограничения данных

      - Если факт не подтвержден источником, поле может быть опущено.
      - Отсутствие поля означает «неизвестно», а не «точно нет».
      - Тариф не входит в формулу условного рейтинга.
      "
    `);
  });
});
