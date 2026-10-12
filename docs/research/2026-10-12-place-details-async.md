# Async Svelte для сведений об участке

Задача: [#901](https://github.com/silentroach/kpshelkovo/issues/901). Исходное состояние: `d23c24119284ed7fdd33254337002b8845a90dfe`, 12 октября 2026 года. Исследованы загрузка сведений и попап; SDK, слои и поиск не переделывались.

## Вывод

**Рекомендация оставить текущий код, без async-пилота и OpenSpec change, согласована владельцем.** Ручное управление сведениями невелико, а async-вариант требует дополнительных решений для немедленного переключения попапа, последующей загрузки и общего запроса. Экспериментальный синтаксис пока не даёт достаточного упрощения.

Стабильный `{#await}` остаётся возможным локальным упрощением при будущей работе над попапом. Сейчас нет причины менять работающую реализацию только ради сокращения флагов.

## Контекст и источники

- Установленные версии: Svelte **5.57.1**, Astro **7.3.5**, `@astrojs/svelte` **9.0.1**, `@sveltejs/vite-plugin-svelte` **7.3.1**; Node **24.20.0**. Зависимости закреплены в [lock-файле](/pnpm-lock.yaml).
- В [Svelte config](/apps/www/svelte.config.js) уже включён `experimental.async` (строки 8–11). [Astro config](/apps/www/astro.config.ts) задаёт static output (строка 52), [страница карты](/apps/www/src/pages/map/index.astro) использует `client:load` (55–65).
- [Endpoint сведений](/apps/www/src/pages/map/data/parcels/details/[code].json.ts) создаёт статические JSON (6–17). В [PlaceMap](/apps/www/src/components/places/PlaceMap.svelte) их браузерное чтение находится внутри `onMount`; начальный `selectedParcel` пуст.
- Актуальные официальные документы получены через Context7 CLI, Svelte MCP и Astro MCP: [async expressions](https://svelte.dev/docs/svelte/await-expressions), [boundary](https://svelte.dev/docs/svelte/svelte-boundary), [`{#await}`](https://svelte.dev/docs/svelte/await), [`getAbortSignal`](https://svelte.dev/docs/svelte/svelte#getAbortSignal), [`$effect.pending`](https://svelte.dev/docs/svelte/$effect#$effect.pending), [Astro Svelte integration](https://docs.astro.build/en/guides/integrations-guide/svelte/).
- Дополнительно прочитан установленный runtime и renderer. В `@astrojs/svelte/dist/server.js` используется `await render(...)`; в `dist/client.svelte.js` — `hydrate` и `unmount` по `astro:unmount`. Это наличие нужных механизмов, а не доказанная совместимость полной карты с альтернативной загрузкой.

## Три варианта

### Текущий `loadDetails` / `showDetails`

В [PlaceMap](/apps/www/src/components/places/PlaceMap.svelte):

- `detailsCache` и `detailsRequests` принадлежат одному экземпляру карты (488–489). `loadDetails` объединяет незавершённые запросы одного кода, проверяет ответ, удаляет завершённый запрос и сохраняет успешный снимок (559–592).
- `showDetails` поддерживает данные/loading/error и отбрасывает поздний результат через `selectionRevision` и `destroyed` (593–616). Смена выбора или закрытие увеличивает revision (630–670).
- При A → B попап сразу показывает B и loading, а ответ A продолжает наполнять кэш. Отказы не кэшируются; retry повторяет загрузку выбранного участка.
- Доступные сообщения уже имеют `role="status"` и `role="alert"` (1219–1225).

### Стабильный `{#await}`

- Может заменить `selectedDetails`, `detailsLoading`, `detailsError` одним состоянием «готовые данные либо Promise», а `showDetails` — выбором входа await-блока.
- Проверку revision именно для публикации результата можно убрать: установленный `svelte/src/internal/client/dom/blocks/await.js` игнорирует callbacks уничтоженной ветки при смене входа и unmount (54–78, 149–151). Транспортный запрос при этом не отменяется.
- Pending/catch работают и для последующих запросов. Готовый cache hit можно передать обычным значением, без Promise.
- Остаются loader, кэш, объединение запросов, проверка ответа, retry и пересчёт позиции после обновления DOM. Проверки фокуса и очистка SDK также остаются.
- Pending на сервере не предотвращает вызов выражения `{#await load()}`. Нельзя переносить браузерный fetch в безусловную разметку.

### Async `$derived` / boundary / `getAbortSignal()`

- Реактивное вычисление может убрать ручную публикацию данных и локальные stale-result проверки. Но отмена отображения и отмена транспорта — разные задачи.
- `boundary.pending` показывается только при первоначальном ожидании. Для следующих обновлений нужен `$effect.pending()` либо пересоздание ограниченной области.
- Async синхронизирует зависимые обновления: простая схема оставляет A и данные A до готовности B, тогда как сейчас B/loading появляются сразу. Чтобы сохранить поведение, придётся отдельно организовать немедленный выбор и загрузочное тело.
- Пересоздание всего попапа ради pending уничтожает кнопку закрытия и усложняет фокус. Boundary только вокруг тела уменьшает этот риск, но не устраняет необходимость позиционирования.
- `failed` удаляет содержимое boundary; `reset()` пересоздаёт его. Async-derived снаружи boundary нельзя считать автоматически повторяемым загрузчиком при reset: нужно явно обеспечить повтор вычисления.
- Boundary ловит ошибки рендера/effects, но не произвольные ошибки событий и async-работы SDK. `getAbortSignal()` допустим во время derived/effect, не непосредственно в нынешнем `showDetails`.

## Общий запрос, кэш и отмена потребителя

Общий Promise сейчас используется последовательными потребителями внутри одной карты: A → закрытие → A или A → B → A до завершения первого запроса. Межкомпонентного общего кэша нет.

Если fetch принадлежит сигналу первого потребителя, закрытие или смена выбора отменит и запрос нового потребителя, получившего тот же Promise. Теряется и полезный поздний снимок A. Это меняет существующее поведение повторного использования.

Соразмерный вариант — оставить общий транспорт без consumer abort, а устаревшее отображение поручить Svelte. Тогда `getAbortSignal()` почти нечего отменять. Отдельные отменяемые подписки или учёт потребителей добавили бы новый механизм ради небольшого сценария; он здесь не оправдан.

При любом синтаксисе остаются проверка HTTP/JSON и показанных значений, очистка request-map после отказа, кэш успешных ответов, повтор запроса и ограничения sale-статусов. Также остаются URL/выбор слоя, SDK-якорь, камера, frames/listeners и lifecycle-защита. В [PlaceMap](/apps/www/src/components/places/PlaceMap.svelte) позиция зависит от размеров DOM (490–558, 1019–1025), а фокус после `tick()` проверяет актуальные участок и источник (655–660, 685–698). Async не отменяет эти обязанности.

## Минимальные эксперименты и воспроизводимость

Точные исходники сохранены в двух одноразовых примерах: [SSR](/docs/research/place-details-async-ssr.mjs) и [DOM](/docs/research/place-details-async-dom.mjs). Они используют установленные зависимости, компилируют компоненты в памяти и печатают наблюдения. Файлы компиляции, настоящие запросы, проектная сборка и CI-тесты не нужны. Команды из корня workspace:

```sh
node docs/research/place-details-async-ssr.mjs
node --conditions=browser docs/research/place-details-async-dom.mjs
```

Оба сохранённых примера повторно запущены в worktree 12 октября 2026 года и завершились с кодом 0; результаты совпали с первоначальными наблюдениями ниже.

### SSR: pending не всегда предотвращает запуск загрузчика

SSR-пример разрешает пакеты через `createRequire` от `/apps/www/package.json`, компилирует с `{ generate: 'server', experimental: { async: true } }` и вызывает `await render(Component, { props: { load } })`. Импорты `svelte/*`, включая side-effect import async flag, заменяются на абсолютные file URL для загрузки через data URL.

Общий загрузчик: `load = () => { calls++; return Promise.resolve('ok'); }`, перед каждым вариантом обнулить `calls`. Каждый компонент принимает `load` через `$props()`; HTML pending — `<p>pending</p>`.

- `{#await load()}` с pending/then: **1 вызов**, HTML pending.
- `{#if selected}` с начальным `$state(undefined)` вокруг boundary и `{await load()}`: **0 вызовов**, попап отсутствует.
- `{await load()}` непосредственно внутри boundary с pending snippet: **0 вызовов**, HTML pending.
- `let data = $derived(await load())` в script снаружи boundary, `{data}` внутри boundary: **1 вызов**, HTML pending.

Для сохранения браузерной загрузки нужен клиентский запуск и пустой начальный выбор. Boundary вокруг вывода не защищает от безусловного async-derived снаружи. Переход на `client:only` не требуется.

### DOM: первоначальное и последующее ожидание

DOM-пример создаёт `Window` из установленного `happy-dom` и устанавливает DOM globals до импорта runtime. Компоненты компилируются с `{ generate: 'client', experimental: { async: true } }` и монтируются через `mount` из `svelte`.

Общий script: `let { load } = $props(); let id = $state('A'); export function choose(value) { id = value; }`. Перед загрузочным блоком вывести `<header>{id}</header>`.

- Стабильная разметка: `{#await load(id)}` с `<p>pending</p>`, then `<p>{data}</p>` и catch.
- Async-разметка: boundary с `<p>{await load(id)}</p>`, индикатором `{#if $effect.pending()}<span>updating</span>{/if}`, pending и failed snippets.
- `load(id)` возвращает Promise из `Promise.withResolvers()`, сохранённый по id. После mount, разрешения A, `app.choose('B')` и разрешения B выполнить по десять `await tick()`, затем читать `target.textContent`. Завершить `unmount` и закрыть happy-dom Window.

Наблюдения повторного запуска сохранённых примеров в worktree 12 октября 2026 года:

- `{#await}`: `Apending → Adata-A → Bpending → Bdata-B`.
- Async: `Apending → Adata-A → Adata-Aupdating → Bdata-B`.
- В обоих случаях вызовы загрузчика: `['A', 'B']`.

Этот опыт проверяет await в разметке и boundary, а не полноценный async-derived вариант карты, отмену fetch, реальный фокус или SDK.

## Проверки текущей реализации

В подготовленном worktree выполнено из корня:

```sh
pnpm --filter @shelkovo/www exec vitest run src/components/places/tests/PlaceMap.popup.test.ts src/components/places/tests/PlaceMap.lifecycle.test.ts
```

**Результат: 2 файла, 39 тестов прошли**, Vitest 5.0.3, 1,78 с. Установка/setup в рамках этой проверки не выполнялись.

[Popup tests](/apps/www/src/components/places/tests/PlaceMap.popup.test.ts) покрывают retry/повреждённые ответы (109–161), in-flight/cache (163–188), A → B и поздний A (190–232), закрытие/отключение слоя/unmount (234–302), фокус (331–417), позицию (419–512). [Lifecycle tests](/apps/www/src/components/places/tests/PlaceMap.lifecycle.test.ts) проверяют готовность и отказы SDK/импортов, fallback и поздние завершения. Это mock-проверки текущей реализации. Svelte MCP autofixer также не нашёл issues в текущем компоненте.

## Риски, ограничения и будущий пересмотр

- Async-выражения экспериментальны; официальные docs допускают breaking changes вне major-релиза. Уже включённый флаг не делает новую зависимость от этой семантики бесплатной.
- В сохранённом [отчёте ассетов](/docs/bundle/assets.yaml) PlaceMap занимает 25 418 bytes / 8 369 Brotli (85–88). В [отчёте модулей](/docs/bundle/client.yaml) async flag и boundary runtime уже присутствуют, а await block имеет `rendered: 0` (109–113, 161–166). Это исходный снимок, не новый замер и не сравнение вариантов.
- Полные альтернативы не реализованы; их сетевой вес и экономия строк не измерены. Сокращение исходника не доказывает уменьшение бандла. Build/dev, production-гидратация, настоящая карта, браузерный фокус и геометрия в этом исследовании не проверялись.
- Вернуться к выбору стоит при подтверждённом дефекте ручной загрузки, росте похожих сценариев или стабилизации async API. Сначала рассмотреть `{#await}`; пилот оправдан лишь при ясной дополнительной пользе и сохранении поведения общего запроса.
- Будущая приёмка должна проверить A → B → A, поздний reject A, закрытие/reopen, retry, cache hit, отсутствие build-time fetch, initial/subsequent loading, фокус и позицию после смены тела. Настоящий SDK проверять по [правилам среды](/docs/development.md#проверка-настоящих-карт), бандлы — до/после реального изменения по [инструкции](/docs/development.md#анализ-клиентских-бандлов). Возможный откат — вернуть локальную загрузку/разметку попапа, не затрагивая SDK, слои, поиск и общий config.

Для исследовательского issue результата достаточно как обоснованного отказа от внедрения: варианты сопоставлены, исчезающие и сохраняющиеся обязанности названы, ключевые различия воспроизводимы, текущие тесты прошли. Численное сравнение бандлов и полная приёмка альтернатив остаются открытыми измерениями, но не нужны для выбранного отказа; положительное решение о внедрении потребовало бы их отдельно. Reviewer проверил весь diff и независимо воспроизвёл оба опыта; владелец согласовал вывод «без пилота» и разрешил документационный PR.
