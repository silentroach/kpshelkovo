# Proposal

## Why

В [#782](https://github.com/silentroach/kpshelkovo/issues/782), части [#776](https://github.com/silentroach/kpshelkovo/issues/776), нужно отделить действующий контракт статуса от истории ADR-010/031. Неясная фраза об обновлении календаря в реальном времени противоречит принятому в #434 и PR #455 отказу от таймера.

## What Changes

- Закрепить фазы события, полуоткрытые границы окна, приоритет состояния сервиса и совместимость публичного `is_active` в `status-lifecycle`.
- Различить снимок сборки для API, серверных подписей и списков и одноразовый клиентский пересчёт шапки и подписей сервисов при подключении страницы и Astro-навигации.
- Зафиксировать московскую календарную проекцию интервалов, обновление указателя даты при DOM attach и ежедневную пересборку статических данных.
- После согласования сократить ADR-010/031 до причин выбора и ссылок на контракт; убрать устаревшую формулировку о движении указателя даты без перезагрузки. Новый технический подход не требуется.

## Capabilities

### New Capabilities

- `status-lifecycle`: фазы и состояние сервиса, моменты пересчёта, календарная проекция и свежесть статической публикации.

### Modified Capabilities

Нет.

## Impact

- Источники: [ADR-010](/docs/decisions/010-home-status-maintenance-indicator.md), [ADR-031](/docs/decisions/031-status-incident-lifecycle.md), [lifecycle](/apps/www/src/lib/status/lifecycle.ts), [публичный DTO](/apps/www/src/lib/status/public-dto.ts), [календарь](/apps/www/src/lib/status/calendar.ts), [DOM календаря](/apps/www/src/lib/status/year-calendar.dom.ts) и [ежедневный CI](/.github/workflows/ci.yml).
- Объём реализации — документация требований и ADR. Существующие адресные lifecycle/calendar/DOM-тесты служат свидетельством границ; runtime, API-форматы и расписание деплоя не меняются. `stats.updated_at` описывает данные событий, а не момент сборки.
- #783 (`consolidate-search-indexing-contract`) зависит от согласования этого change и использует `status-lifecycle` как владельца временной семантики; окно поисковой актуальности остаётся в [search](/openspec/specs/search/spec.md).
- Production-приёмка для переноса документации не требуется. Реализация начинается после отдельного разрешения владельца на готовые артефакты.
