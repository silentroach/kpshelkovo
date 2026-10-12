# Design

## Context

Мотивация и границы — в [proposal](/openspec/changes/archive/2026-10-12-component-runtime-delivery/proposal.md); задача — [#848](https://github.com/silentroach/kpshelkovo/issues/848). Исследована база `d23c24119284ed7fdd33254337002b8845a90dfe` в ветке `perf/848-component-runtime-delivery`.

- [BaseLayout](/apps/www/src/layouts/BaseLayout.astro) подключает общий [site-runtime](/apps/www/src/scripts/site-runtime.ts). Последний статически импортирует и запускает `installStickyTableHeaders` и `installStatusServiceStateHydration` независимо от наличия компонентов.
- [Табличный installer](/apps/www/src/lib/sticky-table-headers.ts) имеет модульный singleton, сразу ищет shells, подписывается на `astro:after-swap` и `astro:page-load`. При отсутствии таблиц снимает scroll/resize listeners, отменяет requestAnimationFrame и освобождает ссылки на shells.
- [Status installer](/apps/www/src/lib/status/lifecycle.dom.ts) имеет window guard, сразу уточняет подписи и сохраняет listeners `astro:after-swap` и `astro:page-load`. Повторный вызов уточняет текущий DOM без повторной регистрации.
- [StatusServiceState](/apps/www/src/components/status/StatusServiceState.astro) содержит встроенные окна событий; компонент используется карточками обзора `/status/` и страницей `/status/[service]/`. У него пока нет клиентского entry.
- Табличные shells находятся в шаблонах регламента, услуг и активов. Страница поселка сравнения рендерит таблицы через существующие Svelte-компоненты с `client:visible`; их гидратация не должна становиться условием подключения табличного эффекта.
- Зафиксированные [client.yaml](/docs/bundle/client.yaml) и [assets.yaml](/docs/bundle/assets.yaml) показывают в общем entry `rendered` 2466 bytes для таблиц, 1148 для `lifecycle.dom` и 232 для `service-state`; весь entry — 12896 bytes, 3982 Brotli. Это исходные отчёты в Git, не новый запуск анализа в planning-сессии. Сумма `rendered` не равна сетевой экономии.

Применимы [ADR-002](/docs/decisions/002-client-transitions-prefetch-cache.md), [status-lifecycle](/openspec/specs/status-lifecycle/spec.md) и [site-navigation](/openspec/specs/site-navigation/spec.md). Новый ADR не нужен: используются существующие обработанные Astro scripts и installers. Рекомендация advisor передана основной сессией; исследование кода подтверждает подход.

## Goals / Non-Goals

**Goals:**

- Разделить точки доставки двух специальных installers, не переписывая их жизненный цикл.
- Обеспечить первый клиентский переход с обычной страницы и повторное подключение при возвращении по истории.
- Подтвердить границу доставки составом production-бандлов и реальными запросами, а не только отсутствием вызовов на пустом DOM.

**Non-Goals:**

- Выгрузка уже загруженного ES module или удаление единственных navigation listeners после ухода.
- Изменение `home/status`, общего состояния шапки, поиска, аналитики, навигационного прогресса, таймлайна или календаря.
- Generic lazy-loader, реестр runtime-компонентов, Svelte `onMount`, новые зависимости, изменения CSS или удаление эффекта липкого заголовка.
- Обещание численной экономии до измерения либо улучшения CWV без отдельного исследования.

## Decisions

### 1. Подпись сервиса владеет своим обработанным entry

В [StatusServiceState](/apps/www/src/components/status/StatusServiceState.astro) добавить обычный обработанный `<script>`, импортирующий и вызывающий существующий `installStatusServiceStateHydration`. Удалить только его import и вызов из `site-runtime.ts`; остальные инициализации, включая `installHomeStatusHydration`, оставить как есть.

Компонентное подключение охватывает и обзор с несколькими карточками, и detail-страницу без копирования entry в маршруты. Существующие guard и navigation listeners сохраняются: обработанный модуль не обязан исполняться заново при каждой навигации, но installer продолжает подключать текущие подписи. Raw inline script, `is:inline` и `data-astro-rerun` не нужны.

Альтернатива — оставить глобальный import с проверкой DOM: она убирает работу, но не доставку кода. Generic dynamic loader вводит дополнительную асинхронность и собственный lifecycle без подтверждённой необходимости.

### 2. Таблицы используют один небольшой Astro script entry

Создать app-owned `apps/www/src/components/common/StickyTableScript.astro` по образцу [EditorialMapScript](/apps/www/src/components/maps/EditorialMapScript.astro): обычный обработанный `<script>` импортирует и вызывает существующий `installStickyTableHeaders`. Подключить entry в шаблонах:

- [регламента](/apps/www/src/pages/815/regulation/index.astro);
- [услуг](/apps/www/src/pages/815/regulation/services/index.astro);
- [активов](/apps/www/src/pages/815/regulation/assets/index.astro);
- [поселка сравнения](/apps/www/src/pages/815/compare/settlements/[slug]/index.astro).

Удалить табличный import и вызов из общего runtime. Installer и события `astro:after-swap` / `astro:page-load` сохранить. Это адресная доставка для существующих шаблонов, а не новая компонентная система. На странице поселка эффект доступен серверным таблицам до `client:visible`; не переносить его в Svelte и не менять гидратацию таблиц.

Цена выбора — новые шаблоны с такими таблицами должны явно подключать entry. Отдельные scripts в каждом маршруте дублировали бы точку интеграции; Svelte `onMount` не охватывает Astro-таблицы и откладывает эффект до гидратации. Удаление эффекта меняет согласованное поведение и исключено.

### 3. Проверять доставку отдельно от поведения

После разрешения реализации выполнить baseline `pnpm bundle:analyze`, сохранить оба YAML вне публикуемых файлов для сравнения; после правок повторить анализ и сохранить актуальные YAML в изменении. Сопоставить модули, entry/dependency graph, оригинальный и Brotli/gzip вес, а также суммарную стоимость реально загружаемых JS на выбранных страницах. Перенос в shared chunk, который всё равно импортируется обычной страницей, не проходит приёмку.

В новых именованных browser sessions с чистым документом проверять production-запросы отрицательных страниц: `/news/`, существующая страница мероприятия `/events/YYYY/MM/slug/` и существующая страница журнала статуса. Перед записью результатов указать выбранные URL и убедиться, что на них нет обоих целевых компонентов. Общие status-зависимости шапки допускаются; исключается именно DOM-уточнение подписей сервисов и табличный код.

Положительные запросы и поведение проверить на всех перечисленных табличных шаблонах, `/status/` и одной странице сервиса. Проверить direct load, первый client transition, повторные переходы и back/forward на desktop/mobile, состояние после scroll/resize и отсутствие активной табличной работы после ухода. Для подписей отдельно проверить момент начала/конца встроенного окна, несколько карточек и отсутствие дублей listeners. При восстановлении документа не вводить новый пересчёт на `pageshow`/возврат к вкладке сверх действующего status-контракта.

Использовать существующий [sticky-table-lifecycle.browser.spec.ts](/apps/www/tests/sticky-table-lifecycle.browser.spec.ts), [sticky-table-headers.dom.test.ts](/apps/www/src/lib/tests/sticky-table-headers.dom.test.ts), [lifecycle.dom.test.ts](/apps/www/src/lib/status/tests/lifecycle.dom.test.ts) и [lifecycle.test.ts](/apps/www/src/lib/status/tests/lifecycle.test.ts). Недостающую регрессию status installer покрыть адресно, не строить постоянный CI smoke-обход страниц ради разовой сетевой приёмки. Общую шапку и сводку главной проверить связанными существующими тестами и коротким браузерным сценарием.

## Risks / Trade-offs

- [Обработанный script впервые загружается при клиентском переходе] → проверить реальную первую навигацию с отрицательной страницы, а не только искусственный dispatch событий или повтор уже загруженного entry.
- [Сборщик создаёт неожиданные shared chunks] → сверить оба YAML и весь фактический граф запросов; отсутствие отдельного файла ещё не доказывает отсутствие его кода.
- [Повторное подключение нескольких карточек или back/forward] → сохранить installers и guards, проверить новые DOM-узлы и отсутствие умножения listeners.
- [Поздняя гидратация Svelte-таблиц] → проверить эффект до и после `client:visible`, не менять компонентный lifecycle.
- [Результат зависит от сжатия и границ чанков] → сообщить измеренную разницу общего entry и загрузки страниц, без вычитания суммы `rendered` из сетевого веса и без фиксированного byte-budget в specs.
- [Порт dev занят другим worktree] → соблюдать очередь; сейчас dev не запускать. При последующей приёмке использовать только согласованный стек, закрыть свои browser sessions и остановить только свой сервер.

## Migration Plan

1. После отдельного разрешения реализации снять baseline и выполнить адресный перенос imports/вызовов с сохранением installers.
2. Выполнить проверки из tasks, актуализировать YAML, пройти полный reviewer и исправить подтверждённые замечания.
3. После приёмки синхронизировать основные specs, архивировать change и пройти повтор по итоговому diff перед PR согласно проектному workflow. Commit/push/PR требуют разрешения; в planning-сессии их нет.
4. При регрессии откатить согласованное изменение целиком: точки подключения, тестовые дополнения, отчёты и specs. Миграции данных и инфраструктуры нет.
