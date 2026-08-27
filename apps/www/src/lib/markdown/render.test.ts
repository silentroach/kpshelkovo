import { describe, expect, it } from 'vitest';

import { createPersonMentionTarget } from '../people/mentions';
import {
  preprocessSiteMarkdown,
  preprocessSiteMarkdownContent,
  renderMarkdown,
} from './render';

describe('renderMarkdown', () => {
  it('preprocesses loader body content through the shared app pipeline', () => {
    const registry = new Map([
      [
        'kschemelinin',
        createPersonMentionTarget('kschemelinin', 'Кирилл Щемелинин'),
      ],
    ]);

    expect(
      preprocessSiteMarkdownContent(
        'Работы подтвердил @kschemelinin.\n\n',
        'test body',
        registry,
      ),
    ).toEqual({
      markdown: 'Работы подтвердил [Кирилл Щемелинин](/people/kschemelinin/).',
      mentions: [registry.get('kschemelinin')],
    });
  });

  it('keeps blank loader body content mention-free', () => {
    expect(
      preprocessSiteMarkdownContent('  \n', 'test body', new Map()),
    ).toEqual({
      markdown: '',
      mentions: [],
    });
  });

  it('passes source entity validation for loader body content', () => {
    const registry = new Map([
      [
        'kschemelinin',
        createPersonMentionTarget('kschemelinin', 'Кирилл Щемелинин'),
      ],
    ]);

    expect(() =>
      preprocessSiteMarkdownContent(
        'Автобиография @kschemelinin.',
        'test body',
        registry,
        {
          type: 'person',
          slug: 'kschemelinin',
        },
      ),
    ).toThrow('test body contains self entity mention "person:kschemelinin"');
  });

  it('preprocesses app-level people mentions and returns mention metadata', () => {
    const registry = new Map([
      [
        'kschemelinin',
        createPersonMentionTarget('kschemelinin', 'Кирилл Щемелинин'),
      ],
    ]);

    expect(
      preprocessSiteMarkdown('Работы подтвердил @kschemelinin.', {
        mentions: {
          registry,
          context: 'test markdown',
        },
      }),
    ).toEqual({
      markdown: 'Работы подтвердил [Кирилл Щемелинин](/people/kschemelinin/).',
      mentions: [registry.get('kschemelinin')],
    });
  });

  it('renders markdown with app-level people mentions processing', () => {
    const registry = new Map([
      [
        'kschemelinin',
        createPersonMentionTarget('kschemelinin', 'Кирилл Щемелинин', {
          gen: 'Кирилла Щемелинина',
        }),
      ],
    ]);

    expect(
      renderMarkdown('По словам @kschemelinin:gen, работы идут.', {
        mentions: {
          registry,
          context: 'test markdown',
        },
      }),
    ).toBe(
      '<p>По\u00A0словам <a href="/people/kschemelinin/">Кирилла Щемелинина</a>, работы идут.</p>',
    );
  });

  it('renders labelled people mentions with author text preserved', () => {
    const registry = new Map([
      [
        'kschemelinin',
        createPersonMentionTarget('kschemelinin', 'Кирилл Щемелинин'),
      ],
    ]);

    expect(
      renderMarkdown('По словам [главного по электричеству](@kschemelinin).', {
        mentions: {
          registry,
          context: 'test markdown',
        },
      }),
    ).toBe(
      '<p>По\u00A0словам <a href="/people/kschemelinin/">главного по\u00A0электричеству</a>.</p>',
    );
  });

  it('adds a matching file icon to PDF links', () => {
    expect(
      renderMarkdown(
        '[Оригинальный документ (PDF)](https://media.example.com/plan.PDF?download=1) и [страница документа](https://example.com/plan/).',
      ),
    ).toMatchInlineSnapshot(`
      "<p><a href="https://media.example.com/plan.PDF?download=1" class="ui-file-link"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 24" class="ui-file-link__icon" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="ui-file-pdf-icon__page" d="M7.25 2.75h8l5.5 5.5v13H7.25z"></path><path class="ui-file-pdf-icon__label" d="M15.25 2.75v5.5h5.5"></path><path class="ui-file-pdf-icon__label" d="M9.25 17.75v-5h1.5a1.5 1.5 0 0 1 0 3h-1.5"></path><path class="ui-file-pdf-icon__label" d="M13.75 12.75v5h1a2.5 2.5 0 0 0 0-5h-1"></path><path class="ui-file-pdf-icon__label" d="M18.25 17.75v-5h2.5M18.25 15.25h2"></path></svg>Оригинальный документ (PDF)</a> и <a href="https://example.com/plan/">страница документа</a>.</p>"
    `);
  });

  it('renders hyphen-prefixed ordered Markdown items as one ordered list', () => {
    expect(
      renderMarkdown(`\`\`\`txt
- 1. Не список
\`\`\`

Лето:

- 1. Первый пункт
- 2. Второй пункт`),
    ).toMatchInlineSnapshot(`
      "<pre><code class=\"language-txt\">- 1. Не список
      </code></pre>
      <p>Лето:</p>
      <ol>
      <li>Первый пункт</li>
      <li>Второй пункт</li>
      </ol>"
    `);
  });

  it('renders legal outline markers as paragraphs when decimal subclauses follow', () => {
    expect(
      renderMarkdown(`1. Parent clause:

1.1. First subclause.

1.2. Second subclause.

2. Next clause:

2.1. Nested subclause.

Regular list:

1. First item
2. Second item`),
    ).toMatchInlineSnapshot(`
      "<p>1. Parent clause:</p>
      <p>1.1. First subclause.</p>
      <p>1.2. Second subclause.</p>
      <p>2. Next clause:</p>
      <p>2.1. Nested subclause.</p>
      <p>Regular list:</p>
      <ol>
      <li>First item</li>
      <li>Second item</li>
      </ol>"
    `);
  });

  it.each([
    ['1.1', '1.2', '- Первое условие;\n- Второе условие.'],
    ['3.5', '3.6', '- 1. Погрузчик;\n- 2. Самосвал.'],
    ['3.14', '3.15', '- В будние дни;\n- В выходные дни.'],
    ['4.1', '4.1.1', '- Первая обязанность;\n- Вторая обязанность.'],
  ])(
    'restores the legal list boundary from %s to %s',
    (previous, candidate, list) => {
      const markdown = `${previous}. Юридический пункт:

${list}

  ${candidate}. Следующий юридический пункт.`;

      expect(preprocessSiteMarkdown(markdown).markdown).toContain(
        `\n\n${candidate}. Следующий юридический пункт.`,
      );
    },
  );

  it('preserves list continuations, nested lists, fences, and regular ordered lists', () => {
    const markdown = `1.1. Юридический пункт:

- Первое условие;
- Второе условие.

  Обычное продолжение последнего условия.

  9.9. Ссылка на другой подпункт внутри условия.

  - Вложенное условие

  1. Первый вложенный пункт
  2. Второй вложенный пункт

\`\`\`txt
- Не список.

  1.2. Не юридический пункт.
\`\`\`

Обычный нумерованный список:

1. Первый пункт
2. Второй пункт`;

    expect(preprocessSiteMarkdown(markdown).markdown).toBe(markdown);
  });

  it('renders change fences as readable word-level diffs', () => {
    expect(
      renderMarkdown(`\`\`\`change
-Собственники могут передать документы до 30 июня.
+Собственники могут передать документы до 7 июля.
\`\`\``).replaceAll('\u00A0', '·'),
    ).toMatchInlineSnapshot(`
      "<section class="ui-content-diff ui-content-diff--inline" aria-label="Изменение текста">
        <div class="ui-content-diff__side ui-content-diff__side--removed">
          <p class="ui-content-diff__label"><span aria-hidden="true">−</span> Было</p>
          <p class="ui-content-diff__text">Собственники могут передать документы до·<del class="ui-content-diff__change ui-content-diff__change--removed">30·июня</del>.</p>
        </div>
        <div class="ui-content-diff__side ui-content-diff__side--added">
          <p class="ui-content-diff__label"><span aria-hidden="true">+</span> Стало</p>
          <p class="ui-content-diff__text">Собственники могут передать документы до·<ins class="ui-content-diff__change ui-content-diff__change--added">7·июля</ins>.</p>
        </div>
      </section>"
    `);
  });

  it('renders heavily changed text as stacked full-text blocks', () => {
    expect(
      renderMarkdown(`\`\`\`change
-Обслуживание станции глубокой биологической очистки — от 5 000 руб. Покраска и ремонт существующего ограждения — индивидуально. Топосъемка участка — от 15 000 руб. Регистрация построенных объектов — от 35 000 руб. Охранные услуги — индивидуально.
+Обслуживание автоматики ворот — от 5 000 руб. Ремонт/покраска ограждения — от 15 000 руб. Топосъемка — от 20 000 руб. Регистрация строений — от 35 000 руб. Страхование — индивидуальный расчет. Клининг — индивидуальный расчет.
\`\`\``).replaceAll('\u00A0', '·'),
    ).toMatchInlineSnapshot(`
      "<section class="ui-content-diff ui-content-diff--block" aria-label="Изменение текста">
        <div class="ui-content-diff__side ui-content-diff__side--removed">
          <p class="ui-content-diff__label"><span aria-hidden="true">−</span> Было</p>
          <p class="ui-content-diff__text">Обслуживание станции глубокой биологической очистки·— от·5 000·руб. Покраска и·ремонт существующего ограждения·— индивидуально. Топосъемка участка·— от·15 000·руб. Регистрация построенных объектов·— от·35 000·руб. Охранные услуги·— индивидуально.</p>
        </div>
        <div class="ui-content-diff__side ui-content-diff__side--added">
          <p class="ui-content-diff__label"><span aria-hidden="true">+</span> Стало</p>
          <p class="ui-content-diff__text">Обслуживание автоматики ворот·— от·5 000·руб. Ремонт/покраска ограждения·— от·15 000·руб. Топосъемка·— от·20 000·руб. Регистрация строений·— от·35 000·руб. Страхование·— индивидуальный расчет. Клининг·— индивидуальный расчет.</p>
        </div>
      </section>"
    `);
  });

  it('keeps recognizable multi-line price lists side by side', () => {
    expect(
      renderMarkdown(`\`\`\`change
-Подключение к системе электроснабжения — 186 000 руб
-Подключение к системе водоснабжения — от 108 000 руб
-Подключение к интернет — от 12 000 руб
+Подключение к системе электроснабжения — 197 000 руб.
+Подключение к системе водоснабжения — 121 000 руб.
+Подключение к системе газоснабжения — 490 000 руб.
+Прокол под дорогой (при необходимости) — 60 000 руб.
+Подключение к сети Интернет — 12 000 руб.
\`\`\``),
    ).toMatchInlineSnapshot(`
      "<section class="ui-content-diff ui-content-diff--inline" aria-label="Изменение текста">
        <div class="ui-content-diff__side ui-content-diff__side--removed">
          <p class="ui-content-diff__label"><span aria-hidden="true">−</span> Было</p>
          <p class="ui-content-diff__text">Подключение к системе электроснабжения — <del class="ui-content-diff__change ui-content-diff__change--removed">186 000 руб</del>
      Подключение к системе водоснабжения —<del class="ui-content-diff__change ui-content-diff__change--removed"> от 108 000 руб</del>
      Подключение к интернет —<del class="ui-content-diff__change ui-content-diff__change--removed"> от</del> 12 000 руб</p>
        </div>
        <div class="ui-content-diff__side ui-content-diff__side--added">
          <p class="ui-content-diff__label"><span aria-hidden="true">+</span> Стало</p>
          <p class="ui-content-diff__text">Подключение к системе электроснабжения — <ins class="ui-content-diff__change ui-content-diff__change--added">197 000 руб.
      </ins>Подключение к системе водоснабжения — <ins class="ui-content-diff__change ui-content-diff__change--added">121 000 руб.
      </ins>Подключение к <ins class="ui-content-diff__change ui-content-diff__change--added">системе газоснабжения — 490 000 руб.
      Прокол под дорогой (при необходимости) — 60 000 руб.
      Подключение к сети </ins>Интернет — 12 000 руб.</p>
        </div>
      </section>"
    `);
  });

  it('highlights prices with currency as one changed segment', () => {
    expect(
      renderMarkdown(`\`\`\`change
-Подключение к системе электроснабжения — 186 000 руб
+Подключение к системе электроснабжения — 197 000 руб.
\`\`\``),
    ).toMatchInlineSnapshot(`
      "<section class="ui-content-diff ui-content-diff--inline" aria-label="Изменение текста">
        <div class="ui-content-diff__side ui-content-diff__side--removed">
          <p class="ui-content-diff__label"><span aria-hidden="true">−</span> Было</p>
          <p class="ui-content-diff__text">Подключение к системе электроснабжения — <del class="ui-content-diff__change ui-content-diff__change--removed">186 000 руб</del></p>
        </div>
        <div class="ui-content-diff__side ui-content-diff__side--added">
          <p class="ui-content-diff__label"><span aria-hidden="true">+</span> Стало</p>
          <p class="ui-content-diff__text">Подключение к системе электроснабжения — <ins class="ui-content-diff__change ui-content-diff__change--added">197 000 руб.</ins></p>
        </div>
      </section>"
    `);
  });

  it('renders short low-common replacements as full-text blocks', () => {
    expect(
      renderMarkdown(`\`\`\`change
-В случае недостижения согласия сторонами, спор передается на рассмотрение в судебные инстанции по месту нахождения Обслуживающей компании.
+При невозможности урегулирования в процессе переговоров спорных вопросов, споры разрешаются в суде в порядке, установленным действующим законодательством РФ.
\`\`\``),
    ).toMatchInlineSnapshot(`
      "<section class="ui-content-diff ui-content-diff--block" aria-label="Изменение текста">
        <div class="ui-content-diff__side ui-content-diff__side--removed">
          <p class="ui-content-diff__label"><span aria-hidden="true">−</span> Было</p>
          <p class="ui-content-diff__text">В случае недостижения согласия сторонами, спор передается на рассмотрение в судебные инстанции по месту нахождения Обслуживающей компании.</p>
        </div>
        <div class="ui-content-diff__side ui-content-diff__side--added">
          <p class="ui-content-diff__label"><span aria-hidden="true">+</span> Стало</p>
          <p class="ui-content-diff__text">При невозможности урегулирования в процессе переговоров спорных вопросов, споры разрешаются в суде в порядке, установленным действующим законодательством РФ.</p>
        </div>
      </section>"
    `);
  });

  it('does not highlight case-only or punctuation-only changes', () => {
    expect(
      renderMarkdown(`\`\`\`change
-Интернет — 12 000 руб.
+интернет — 12 000 руб!
\`\`\``),
    ).toMatchInlineSnapshot(`
      "<section class="ui-content-diff ui-content-diff--inline" aria-label="Изменение текста">
        <div class="ui-content-diff__side ui-content-diff__side--removed">
          <p class="ui-content-diff__label"><span aria-hidden="true">−</span> Было</p>
          <p class="ui-content-diff__text">Интернет — 12 000 руб.</p>
        </div>
        <div class="ui-content-diff__side ui-content-diff__side--added">
          <p class="ui-content-diff__label"><span aria-hidden="true">+</span> Стало</p>
          <p class="ui-content-diff__text">интернет — 12 000 руб!</p>
        </div>
      </section>"
    `);
  });

  it('renders short uneven multi-line replacements as full-text blocks', () => {
    expect(
      renderMarkdown(`\`\`\`change
-Строительство въезда и парковки для строительной техники — 125 000 руб
+Строительство въездной группы — 192 000 руб.
+Проход под калитку — 50 000 руб.
\`\`\``),
    ).toMatchInlineSnapshot(`
      "<section class="ui-content-diff ui-content-diff--block" aria-label="Изменение текста">
        <div class="ui-content-diff__side ui-content-diff__side--removed">
          <p class="ui-content-diff__label"><span aria-hidden="true">−</span> Было</p>
          <p class="ui-content-diff__text">Строительство въезда и парковки для строительной техники — 125 000 руб</p>
        </div>
        <div class="ui-content-diff__side ui-content-diff__side--added">
          <p class="ui-content-diff__label"><span aria-hidden="true">+</span> Стало</p>
          <p class="ui-content-diff__text">Строительство въездной группы — 192 000 руб.
      Проход под калитку — 50 000 руб.</p>
        </div>
      </section>"
    `);
  });

  it('supports manual stacked mode for short change fences', () => {
    expect(
      renderMarkdown(`\`\`\`change block
-Старый короткий текст.
+Новый короткий текст.
\`\`\``),
    ).toMatchInlineSnapshot(`
      "<section class=\"ui-content-diff ui-content-diff--block\" aria-label=\"Изменение текста\">
        <div class=\"ui-content-diff__side ui-content-diff__side--removed\">
          <p class=\"ui-content-diff__label\"><span aria-hidden=\"true\">−</span> Было</p>
          <p class=\"ui-content-diff__text\">Старый короткий текст.</p>
        </div>
        <div class=\"ui-content-diff__side ui-content-diff__side--added\">
          <p class=\"ui-content-diff__label\"><span aria-hidden=\"true\">+</span> Стало</p>
          <p class=\"ui-content-diff__text\">Новый короткий текст.</p>
        </div>
      </section>"
    `);
  });

  it('keeps regular diff fences as code blocks', () => {
    expect(
      renderMarkdown(`\`\`\`diff
-Старый текст
+Новый текст
\`\`\``),
    ).toMatchInlineSnapshot(`
      "<pre><code class=\"language-diff\">-Старый текст
      +Новый текст
      </code></pre>"
    `);
  });
});
