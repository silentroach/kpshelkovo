# @shelkovo/markdown

Общий пакет для Markdown-рендера, типографики и генерации Markdown через mdast.

## Публичный API

- `render(markdown, options?)`
  Рендерит Markdown в HTML. Выполняет preprocessors до парсинга, применяет GFM, отбрасывает raw HTML и типографирует текстовые узлы. Markdown-таблицы отклоняет с ошибкой. В `apps/www` body markdown проходит через `@/lib/markdown/render`, чтобы сработала доменная обработка приложения.

- `MarkdownPreprocessor`, `RenderOptions`
  Preprocessor принимает Markdown-строку и возвращает строку. `options.preprocess` принимает одну функцию или последовательность функций. `eagerImages: true` задаёт изображениям `loading="eager"`; по умолчанию используется `loading="lazy"`. Options пакета универсальны, доменная логика остаётся в приложении.

- `createMarkdownDocument({ frontmatter, children })`
  Создаёт mdast `Root`. Если передан `frontmatter`, добавляет YAML-узел первым. Объект сериализуется через `yaml` с блочными коллекциями, отступом в два пробела, без директив и переноса строк по ширине; кавычки определяются содержимым значений. Состав публичных полей выбирает вызывающий код.

- `serializeMarkdownDocument(document)`
  Сериализует mdast `Root` в Markdown: ATX-заголовки, списки через `-` и `1.`, ограждённые блоки кода, GFM и финальный перевод строки. Отдельный абзац `[TOC]` заменяет содержанием по заголовкам `h2`–`h6`. Markdown-таблицы отклоняет с ошибкой.

- `parseMarkdownFragment(markdown)`
  Парсит существующий редакционный Markdown в `readonly RootContent[]` с поддержкой GFM. Позволяет вставлять его в документ с сохранением разметки. YAML frontmatter из фрагмента удаляется.

- `md`
  Тонкие фабрики mdast-узлов: `heading`, `paragraph`, `text`, `link`, `list`, `listItem`, `inlineCode`, `code`, `blockquote`, `thematicBreak` и `yaml`. Строковые аргументы заголовков, абзацев и ссылок означают обычный текст; для форматирования передаются узлы. Можно использовать стандартные mdast-узлы напрямую. Типы входов и параметров экспортируются из пакета, их определения — в [generate-types.ts](src/generate-types.ts).

- `resolveMarkdownResourceReferences(children)`
  Разрешает reference-ссылки и изображения по definitions, превращая их в обычные узлы `link` и `image`, затем удаляет definitions. Это позволяет делить редакционный документ на самостоятельные фрагменты без потери адресов. Меняет вложенные узлы переданного дерева.

- `extractFirstMarkdownText(markdown)`, `extractMarkdownText(markdown)`
  Извлекают соответственно первый непустой читаемый блок или весь читаемый текст. Пропускают блоки кода, raw HTML, YAML и definitions; используют image alt и текст inline-кода. Схлопывают пробельные символы, включая NBSP, в обычный пробел и обрезают края. Возвращают `undefined`, если читаемого текста нет.

- `formatDynamicHtml(html)`
  Типографирует короткую готовую HTML/text-строку: заголовок, подпись или текст подсказки, которым не нужен Markdown parsing или обёртка `<p>`.

- `rehypeTypograf()`, `satteriTypograf()`
  Плагины типографики для внешних rehype- и Satteri-pipelines соответственно. Используют общие правила пакета для текстовых узлов, пропуская код и другие защищённые элементы.

## Пример генерации

```js
import {
  createMarkdownDocument,
  md,
  parseMarkdownFragment,
  serializeMarkdownDocument
} from '@shelkovo/markdown';

const editorialBody = 'Описание с **редакционным выделением**.';
const document = createMarkdownDocument({
  frontmatter: { title: 'Справка' },
  children: [
    md.heading(1, 'Справка'),
    md.list([md.listItem([md.paragraph([md.link('/kb/', 'База знаний')])])]),
    ...parseMarkdownFragment(editorialBody)
  ]
});

const markdown = serializeMarkdownDocument(document);
```

Ссылки и списки здесь создаются узлами; парсер обрабатывает только готовый редакционный текст.

## Использование в `apps/www`

- [Инструкции приложения: Markdown](../../apps/www/AGENTS.md#markdown) — выбор обёртки, подготовка body для mentions/backlinks, импорты и расширение доменной обработки. Обёртка использует общий слой упоминаний сущностей, включая людей и места, перед пакетным рендером.
- [Корневые инструкции](../../AGENTS.md#локальные-инструкции) — правила AST-генерации публичных документов и вставки редакционных фрагментов.
- [ADR-003](../../docs/decisions/003-markdown-pipeline-layering.md) и [ADR-008](../../docs/decisions/008-markdown-ast-generation.md) — причины выбора слоистого рендера и AST-генерации.
