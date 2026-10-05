# Proposal

## Why

В [#784](https://github.com/silentroach/kpshelkovo/issues/784), части [#776](https://github.com/silentroach/kpshelkovo/issues/776), нужно отделить действующий контракт архива встреч от истории MVP в [ADR-014](/docs/decisions/014-meetings-transcript-first-archive.md). Это позволит сохранять точность транскрипта и ссылки на реплики без повторения схемы данных и временных ограничений.

## What Changes

- Выделить `meetings-archive`: полная транскрипция как проверяемый источник, отдельность редакционных выводов, спикеры, части исходных записей и временные якоря.
- Закрепить существующие HTML/Markdown URL и навигацию к полным частям; индексы остаются компактными. Исправление времени может менять якорь, а одинаковое время требует детерминированного суффикса в пределах всей встречи.
- Сократить ADR до причин transcript-first и деления по исходным записям, согласовать индекс ADR и ссылки. Формат подготовки остаётся у [редакционных правил](/apps/www/src/data/meetings/AGENTS.md) и [raw-схемы](/apps/www/src/lib/meetings/raw-schema.ts).

### Границы

HTML-хаб ведёт открытая [#139](https://github.com/silentroach/kpshelkovo/issues/139). Отсутствие хаба, iframe, JSON и времени окончания в старом MVP не переносится как вечный запрет. Общий HTTP/discovery-контракт принадлежит [#781](https://github.com/silentroach/kpshelkovo/issues/781), будущему change `extract-public-representations-contracts`; общие упоминания — [#779](https://github.com/silentroach/kpshelkovo/issues/779), будущему `extract-entity-mentions-contract`.

## Capabilities

### New Capabilities

- `meetings-archive`: точность источника, цитирование реплик и чтение транскрипта по частям исходной записи.

### Modified Capabilities

Нет.

## Impact

Документационный перенос существующих обязательств. Основание — [mapper](/apps/www/src/lib/meetings/mapper.ts), [Markdown-представления](/apps/www/src/lib/meetings/markdown.ts), [маршруты](/apps/www/src/lib/meetings/routes.ts) и их существующие тесты. Самостоятельной основной spec архива пока нет. После согласования меняются ADR, его индекс и ссылки; runtime, данные и публичные адреса сохраняются. Production-приёмка не требуется.
