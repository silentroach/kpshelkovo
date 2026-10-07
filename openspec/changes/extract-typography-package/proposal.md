# Proposal

## Why

Строковый типограф уже используется в Astro-подписях, подсказках статуса и сравнении редакций независимо от Markdown, но принадлежит `@shelkovo/markdown`. В [#963](https://github.com/silentroach/kpshelkovo/issues/963) владелец выбрал два отдельных пакета с направлением зависимости `markdown → typography`.

## What Changes

- Выделить `@shelkovo/typography` с общими правилами Typograf и строковыми API `formatText`, `formatTextHtml`, `formatDynamicHtml`.
- Сохранить в `@shelkovo/markdown` Markdown-рендер, генерацию документов, извлечение текста и rehype/Satteri-адаптеры. Адаптеры используют новое общее ядро.
- **BREAKING для внутренних импортов workspace:** перенести потребителей строковых функций на `@shelkovo/typography`, удалить прежний `@shelkovo/markdown/typography` и строковые реэкспорты корневого Markdown-входа. Оба пакета приватные; миграция известных потребителей выполняется одновременно.
- Перенести существующие проверки строковых контрактов к новому владельцу, сохранить межпакетные AST-проверки и уточнить документацию о границах пакетов.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

Нет. Это разделение реализации без изменения результатов типографирования, HTML/CSS-контрактов и требований [date-labels](/openspec/specs/date-labels/spec.md). Используется `skip_specs: true`.

## Impact

- Новый `/packages/typography`, существующий `/packages/markdown`, их manifest/exports/`sideEffects`, тесты и README; зависимости `/apps/www/package.json` и workspace lock-файл.
- Импорты строковой типографики в `/apps/www`; действующие инструкции `/apps/www/AGENTS.md` и граница ответственности в [ADR-003](/docs/decisions/003-markdown-pipeline-layering.md).
- Сравнение production-бандлов и сохранение актуальных YAML-отчётов. Изоляция нового клиентского входа проверяется отдельной сборкой реального импорта.
- Исходная реализация находится в открытом [PR #961](https://github.com/silentroach/kpshelkovo/pull/961). Новый change ведётся отдельно в ветке `refactor/963-extract-typography-package`, созданной от его результата `5ef9b74e`.
- Приёмка локальная: действующие тесты, проверки типов, production-сборка и сравнение бандлов. Production-проверка для закрытия issue не требуется.
