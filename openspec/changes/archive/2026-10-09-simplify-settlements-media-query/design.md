# Design

## Context

Мотивация — в [proposal](/openspec/changes/archive/2026-10-09-simplify-settlements-media-query/proposal.md). `/apps/www/src/compare/components/SettlementsExplorer.svelte` вручную хранит `mobile`, подписывается на `matchMedia` и снимает подписку. В существующем `onMount` ширина единожды определяет `showMap`, затем включаются контролы. Сервер отдаёт длинные подписи, скрытую карту и desktop-placeholder высотой 375px.

Svelte 5.57.1 на сервере использует fallback `MediaQuery`, а браузерный конструктор сразу читает `matchMedia`. Поэтому одного fallback недостаточно для согласованной первой разметки. Компонент гидратируется вручную через `/apps/www/src/compare/client/explorer-component.ts`; bootstrap менять не нужно.

Действующие решения — [ADR-039](/docs/decisions/039-shared-yandex-maps-runtime-and-preview.md), [ADR-034](/docs/decisions/034-native-css-architecture.md), [site-maps](/openspec/specs/site-maps/spec.md). Новые требования не вводятся; `skip_specs: true` сохраняет границы совместимого рефакторинга.

## Goals / Non-Goals

- Использовать штатное управление media-подпиской при сохранении порядка hydration и пользовательского выбора карты.
- Не превращать ширину в реактивную производную `showMap`, не добавлять флаг ручного выбора и не переносить CSS-правила в JS.
- Не менять renderer, URL, эффекты камеры и жизненный цикл SDK.

## Decisions

- Создать локальный `MediaQuery('(max-width: 767px)', false)` из `svelte/reactivity`.
- Подписи используют `controlsReady && mobile.current`: существующая граница готовности сохраняет длинные подписи при SSR и первом проходе hydration.
- В существующем `onMount` один раз установить `showMap = !mobile.current`, затем включить контролы. `onMount` читает значение без отслеживаемой зависимости; `$effect` для синхронизации карты с шириной не нужен.
- Удалить только ручные media-listener и mutable `mobile`; оставить CSS и bootstrap без изменений.
- В component-тесте использовать изменяемый `MediaQueryList` с доставкой `change`, а не статичный mock, который не проверяет resize. Проверять освобождение после штатного асинхронного cleanup, не требовать синхронного удаления подписки.
- Сравнить бандлы до/после в этой ветке, поскольку новый импорт может изменить состав JS. Не брать отчёт соседнего PR вместо собственного результата.

## Risks / Trade-offs

- Браузер знает ширину раньше SSR → использовать `controlsReady` для подписей, не добавляя ещё одно состояние hydration.
- Resize может сбросить выбор → проверки начального состояния и обоих ручных переключений с resize в обе стороны на границе 767/768px.
- Повторная Astro-навигация может оставить подписку → проверить unmount/remount и штатный bootstrap/disposal.
- Mock SDK доказывает hydration и состояние, не работу настоящей карты → явно разделить эти результаты; настоящий SDK проверять только при разрешённом dev-стеке с ключом.

## Migration Plan

- После профильных component/browser проверок, typecheck, сборки, анализа бандлов и reviewer архивировать change без sync новых specs, открыть PR с `Closes #904`.
- Откат — возврат PR вместе с отчётами бандлов. Данные и конфигурация deploy не меняются.
