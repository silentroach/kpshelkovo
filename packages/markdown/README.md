# @shelkovo/markdown

Общий пакет для Markdown-рендера, типографики и генерации Markdown через mdast.

## Публичный API

- `render(markdown, options?)`
  Рендерит body markdown в HTML внутри обертки раздела или приложения. Применяет GFM, отбрасывает raw HTML и типографирует текстовые узлы. В `apps/www` нужно использовать `@/lib/markdown/render`, чтобы сначала сработали preprocessors приложения.

- `createMarkdownDocument({ frontmatter, children })`
  Создает mdast-документ. Если передан `frontmatter`, добавляет YAML-узел первым child и сериализует объект через `yaml` без принудительных кавычек у всех строк.

- `serializeMarkdownDocument(document)`
  Сериализует mdast `Root` в Markdown с единым стилем пакета: ATX-заголовки, `-` для unordered lists, `1.` для ordered lists, fenced code blocks, GFM и финальный перевод строки. Если в документе есть отдельный абзац `[TOC]`, заменяет его на содержание по заголовкам `h2`–`h6`.

- `parseMarkdownFragment(markdown)`
  Парсит Markdown-фрагмент в `readonly RootContent[]`, чтобы вставлять редакционный Markdown в сгенерированный документ как mdast-узлы, а не как экранированный plain text. Frontmatter из фрагмента не переносится в результат.

- `md`
  Набор тонких фабрик mdast-узлов: `heading`, `paragraph`, `text`, `link`, `list`, `listItem`, `inlineCode`, `code`, `blockquote`, `thematicBreak`, `table`, `tableRow`, `tableCell` и `yaml`. Фабрики не заменяют mdast: при необходимости можно передавать обычные mdast-узлы напрямую.

- `MarkdownPreprocessor`
  Тип для Markdown preprocessors приложения. Preprocessors выполняются до Markdown parsing, например для упоминаний вида `@person:case`.

- `RenderOptions`
  Позволяет передать в `render` один preprocessor или pipeline preprocessors. `eagerImages: true` рендерит изображения с `loading="eager"`, чтобы их загрузка не зависела от прокрутки, например для печатаемых материалов. По умолчанию используется `loading="lazy"`. Options пакета должны оставаться универсальными; доменная логика живет в приложении.

- `extractFirstMarkdownText(markdown)`
  Достает excerpt или summary из Markdown source. Не рендерит HTML. Пропускает code, raw HTML, YAML и definitions; использует image alt text.
  Возвращает первый непустой читаемый блок: схлопывает пробельные символы (включая NBSP) в обычный пробел и обрезает края. Если читаемого текста нет, возвращает `undefined`. Потребителям не нужны повторные `replace`, `trim` или проверка на пустую строку.

- `formatDynamicHtml(html)`
  Типографирует короткую готовую HTML/text-строку. Использовать для заголовков, labels и tooltip text, которые не нужно парсить как Markdown или оборачивать в `<p>`.

- `rehypeTypograf()`
  Настраивает внешний Markdown pipeline. Экспортируется для интеграций с framework, например Astro `markdown.rehypePlugins`; не вызывать для обычного рендера контента.

## Использование в `apps/www`

См. [ADR-003](../../docs/decisions/003-markdown-pipeline-layering.md) про слоистую модель Markdown-рендера.

### Рендер vs генерация

- Рендер Markdown в HTML: исходный body markdown проходит через app-wrapper `@/lib/markdown/render`, затем пакетный `render` и preprocessors приложения.
- Генерация Markdown: структурные данные собираются в mdast через `createMarkdownDocument`, `md` и `parseMarkdownFragment`, затем сериализуются через `serializeMarkdownDocument`. Для содержания добавляй отдельный абзац `[TOC]`; пайплайн сам заменит его на список ссылок по заголовкам.
- `parseMarkdownFragment` нужен только для уже написанных Markdown-фрагментов или секционных блоков, где нужно сохранить inline Markdown, списки и autolinks; он не заменяет ручной сериализатор целого документа.

- Body markdown в pages/components должен идти через `@/lib/markdown/render`.
- Обертка сайта вызывает пакетный `render` и держит локальные preprocessors, сейчас упоминания людей из `apps/www/src/lib/people/mentions.ts`.
- Если app-loader заранее сохраняет подготовленный body markdown для mentions/backlinks, он должен брать этот результат из той же обертки сайта, а не вызывать domain preprocessor напрямую.
- Импортировать `render` из `@shelkovo/markdown` напрямую можно только для низкоуровневой обертки или теста пакета.
- Импортировать `formatDynamicHtml` напрямую можно для non-markdown dynamic snippets.
- Импортировать `extractFirstMarkdownText` напрямую можно для excerpt из Markdown source.
- Импортировать `rehypeTypograf` напрямую можно только в config или custom unified/rehype pipeline setup.
- Генерируемые публичные Markdown-документы нужно собирать через `createMarkdownDocument`, `md`, `parseMarkdownFragment` и `serializeMarkdownDocument`, а не локальными строковыми сериализаторами.
