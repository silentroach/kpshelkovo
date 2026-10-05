# Proposal

## Why

После merge #920 выкладка master упала в [CI/CD run 37312038956](https://github.com/silentroach/kpshelkovo/actions/runs/37312038956): с пустым Astro cache шрифт PT Serif не скачался с jsDelivr (`CannotFetchFontFile`, `fetch failed`). Связанный [issue #921](https://github.com/silentroach/kpshelkovo/issues/921): убрать отдельную сетевую зависимость шрифтов на этапе сборки, сохранив принятый результат миграции.

## What Changes

- Вместо удалённого `fontProviders.fontsource()` использовать штатный `fontProviders.local()` и WOFF2 из установленных `@fontsource/fira-sans` / `@fontsource/pt-serif`; закрепить точные версии и lock-файл.
- Сохранить Astro Fonts API, наборы www/media, `unicode-range`, `swap`, fallback-политику, отсутствие preload и same-origin asset-префиксы. Не добавлять собственный provider, загрузчик или retry-обвязку.
- Адаптировать существующие адресные тесты и проверку обязательных font faces к local provider, обновить документацию источника сборки. Подтвердить холодную production-сборку без обращений к Fontsource API/CDN.

## Capabilities

### New Capabilities

Нет. `.openspec.yaml` использует `skip_specs: true`: меняется build-time источник, не контракт для посетителя.

### Modified Capabilities

Нет. Все требования и сценарии [web-font-loading](/openspec/specs/web-font-loading/spec.md) сохраняются; принятый компромисс mobile KB не пересматривается.

## Impact

- Общий build-time модуль и проверка шрифтов в `/packages/ui`, его зависимости и `/pnpm-lock.yaml`; существующие font-тесты и документация. Основной сайт, media и визуальные стенды получают источник через существующие конфигурации.
- Установка пакетов по-прежнему требует registry либо pnpm store. После установки разрешение и копирование шрифтов не должны зависеть от отдельного API/CDN или Astro font cache.
- Workflow, nginx, deploy-пути и CSP не меняются: исправляется источник сборки, а браузер по-прежнему получает same-origin WOFF2. Общий redesign CI, добавление PR build job и повтор deployment не входят в объём.
- Приёмка до PR: холодные production-сборки с запрещёнными font-origin запросами, сравнение бинарных файлов и generated font CSS с принятым master, адресные тесты/typecheck, анализ бандлов и reviewer. Отдельная production-приёмка не требуется; обычный PR использует `Closes #921`. Выкладку после merge выполняет владелец.

Владелец разрешил реализацию этого плана 5 октября 2026 года после его представления в сессии.
