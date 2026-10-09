# Design

## Context

Мотивация — в [proposal](/openspec/changes/format-news-card-typography/proposal.md). Главная уже использует `formatTextHtml` для обоих полей. `NewsCard` используется через `NewsList` в ленте, месячном архиве и подборках по тегу; исходные строки сохраняет loader.

## Goals / Non-Goals

**Goals:** выбрать безопасный вход существующего типографа и подтвердить соответствие главной.

**Non-Goals:** менять типограф, loader, raw schema, контент, feeds, metadata, главную или CSS.

## Decisions

- Применить `formatTextHtml` из `@shelkovo/typography` к ссылке заголовка и абзацу описания через `set:html`. Этот вход сначала экранирует исходный обычный текст и добавляет только разметку типографа.
- `formatDynamicHtml` не подходит: он не санитизирует исходный HTML. `formatText` безопасен при текстовой вставке, но не даёт HTML-обёртку цельного диапазона и полного соответствия главной. Контракт — в [README типографики](/packages/typography/README.md).
- Существующий app-level CSS `nowrap-date-range` достаточен. Не дублировать требования [date-labels](/openspec/specs/date-labels/spec.md) в новой спецификации.
- Сохраняются [ADR-003](/docs/decisions/003-markdown-pipeline-layering.md), [ADR-013](/docs/decisions/013-raw-domain-public-data-boundary.md) и [ADR-034](/docs/decisions/034-native-css-architecture.md).

## Risks / Trade-offs

- Небезопасный HTML-вход → проверить буквальные теги, entities и обработчики в обоих полях.
- Разрыв диапазона или переполнение из-за существующего `overflow-wrap` → проверить узкий экран и реальный перенос.
- Излишние snapshots → небольшой inline snapshot значимой типографики с видимым обозначением NBSP, без полного HTML страницы.

## Ownership and Verification

- Исполнитель меняет только `/apps/www/src/components/news/NewsCard.astro` и добавляет `/apps/www/src/components/news/tests/NewsCard.test.ts`; существующие tests авторства и главной запускаются без правки.
- Проверить эквивалентность главной на общей fixture, исходные строки и назначение ссылки. Проверки ленты, архива и тега — разовая приёмка, не новый постоянный обход сайта.
- Клиентские импорты и загрузка не меняются, анализ бандлов не требуется. Артефакты и sync/archive ведёт оркестратор.
- Приёмка: адресные тесты, typecheck, сборка, валидация OpenSpec и reviewer всего diff. Обычный деплой; откат возвращает change целиком.
