# Proposal

## Why

В [#783](https://github.com/silentroach/kpshelkovo/issues/783), части [#776](https://github.com/silentroach/kpshelkovo/issues/776), действующие правила поиска распределены между ADR-025/035 и spec `search`. Перенос должен сохранить полезный корпус и явно различить внешнюю индексацию и поиск по сайту.

## What Changes

- Дополнить существующий `search` долговечными правилами корпуса, видимого текста, перехода к показанному совпадению и его подсветки, ленивой загрузки, доступности и доказанных алиасов; учесть специальные записи участков по ADR-041.
- Закрепить внешнюю индексацию только landing и сервисных страниц статуса, постоянный `noindex, follow` событий/истории/календарей, self-canonical и исключение этих URL из sitemap/IndexNow.
- Сохранить существующее включительное build-time окно актуальности в 30 × 24 часа в его текущем требовании `search`, без нового дубля. Фазы и время пересчёта принадлежат `status-lifecycle`, восстановление после отказов — `client-load-recovery`, флаги KB — `knowledge-base`.
- После согласования сократить ADR-025/035 до архитектурных причин и ссылок на владельцев. Веса, версия движка и исторические бюджеты пилота не становятся вечными продуктовыми требованиями.

## Capabilities

### New Capabilities

Нет.

### Modified Capabilities

- `search`: общие границы корпуса и поведения клиента, алиасы и внешняя индексация статуса дополняют уже накопленные требования.

## Impact

- Prerequisite: согласовать #782, change `extract-status-lifecycle-contract`, capability `status-lifecycle`. На этапе planning его [delta в ветке docs/782-adr-contracts](https://github.com/silentroach/kpshelkovo/blob/docs/782-adr-contracts/openspec/changes/extract-status-lifecycle-contract/specs/status-lifecycle/spec.md) — отдельный артефакт согласования, ещё не main spec этой ветки. Перед sync #783 зависимость должна попасть в общую базу; после этого ссылка владельца ведёт на `/openspec/specs/status-lifecycle/spec.md`.
- Источники: [ADR-025](/docs/decisions/025-static-full-text-search-with-pagefind.md), [ADR-035](/docs/decisions/035-status-search-indexing.md), [ADR-041](/docs/decisions/041-parcel-records-and-exact-search.md), [search](/openspec/specs/search/spec.md), [client-load-recovery](/openspec/specs/client-load-recovery/spec.md), [knowledge-base](/openspec/specs/knowledge-base/spec.md), [сборщик индекса](/apps/www/scripts/build-search-index.ts) и [правило актуальности](/apps/www/src/lib/status/search.ts).
- #118, #122 и #124 — отдельные исправления. Принятое направление #124 сохраняет основной excerpt и URL по умолчанию; anchor допустим только для того же excerpt. Текущее расхождение реализации не превращается в норму, а перенос не вводит универсальный выбор лучшего sub-result. Существующие требования секций карт остаются у `search`.
- Объём реализации — документация и ссылки. Релевантность, корпус, алиасы, Pagefind и runtime не меняются; ручное сравнение выдачи требуется при их последующем изменении по `site-search`. Production-приёмка документационного переноса не требуется; реализация ждёт отдельного разрешения владельца.
