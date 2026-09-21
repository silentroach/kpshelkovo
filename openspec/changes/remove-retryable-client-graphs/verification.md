# Результаты проверок

## Локальное восстановление данных — задача 3.3

- `pnpm exec vitest run src/lib/search/tests/client.test.ts src/components/search/tests`: 3 файла, 44 passed. Проверено восстановление runtime/configuration Pagefind, exact search и rejected result data, а также UI поиска.
- Пройденные browser compare сценарии подтверждают повтор JSON без повторного запроса компонента и повтор API карты без повторной загрузки JSON/компонента.
- При реальном отказе API карты в локальном просмотре фильтр «Дешевле Шелково» продолжил работать: 64 → 49 карточек, `?price=cheaper`, тот же документ.

## Production-приёмка и размеры — задача 3.2

- Browser compare suite проверила SSR-карточки без JS, disabled controls, одну гидратированную выдачу, отсутствие hydration/mismatch сообщений, сохранение позиции списка, фильтры и URL-state на mobile/desktop.
- Search-quality сценарии `#243`, `#154`, `#355` прошли на полной production-сборке: задержанный lazy chunk, синхронный фокус, сохранение ввода, highlight и повторная работа после ClientRouter-переходов.
- В agent-browser дополнительно выполнен переход сравнение → главная → сравнение: тот же документ, 2 `astro:after-swap`, 64 карточки, `data-explorer-hydrated`, фильтр включён.
- Просмотрены screenshots поиска и сравнения, scoped CSS загружен, нарушений вёрстки не обнаружено. Файлы: временный каталог сессии, `recovery-search.png` и `recovery-compare.png`. В локальном просмотре реальный API карты дал сетевую ошибку; штатный fallback виден, восстановление API отдельно проверено browser-тестом с управляемым ответом.

Повторный холодный замер на `dist/www`, те же сценарии и метод, что в 1.1. Raw / gzip / brotli:

- Главная: 8 JS, **36663 / 14628 / 12866**. Изменение: +971 / +583 / +508 байт.
- Первое открытие поиска: 14 JS, **255987 / 85525 / 76844**. Изменение: −3680 / −552 / −576 байт.
- Прямое сравнение: 14 JS, **107961 / 42397 / 37750**. Изменение: +2239 / +2312 / +1858 байт.

Таким образом, общего выигрыша по трафику нет: поиск немного меньше, начальная страница и сравнение немного больше, запросов больше. Выигрыш изменения — удаление отдельного pipeline.

Общие `/static/` запросы: прежние `ClientRouter`, `page`, `prefetch`, `preload-helper`, `lifecycle` с теми же хешами/размерами и `BaseLayout.astro_astro_type_script_index_0_lang.wMaevfro.js` (11208 / 4167 / 3622).

Дополнительные запросы, относительно общих:

- Главная: `index.astro_astro_type_script_index_0_lang.61sx_yDO.js` (669 / 409 / 347), `src.D8Rq6Akf.js` (5784 / 2782 / 2530).
- Поиск добавляет: `lazy.CIO8icwE.js` (16223 / 6660 / 5876), `client.8uxDfU8K.js` (45556 / 17405 / 15862), `events.Dne4BRe6.js` (70624 / 21957 / 19631), `async.BUaV2Lsk.js` (111 / 125 / 99), прежние `/search/pagefind.js` и `/search/pagefind-worker.js` с теми же размерами.
- Сравнение: `index.astro_astro_type_script_index_0_lang.CWXQTQCe.js` (2098 / 1142 / 984), `explorer-component.DtwPAc7A.js` (21624 / 8018 / 7007), `number.3RH8yx7B.js` (423 / 283 / 254), `runtime.BjK9mNpC.js` (1961 / 1045 / 893), `src.BmC_ntYh.js` (194 / 160 / 132), а также `src.D8Rq6Akf.js`, `async.BUaV2Lsk.js`, `client.8uxDfU8K.js` с размерами выше. Общие чанки в каждом сценарии учтены один раз.

## Отказ JS в браузере — задача 3.1

- `pnpm --filter @shelkovo/www test:browser:search-recovery`: 1 passed.
- `pnpm --filter @shelkovo/www test:browser:compare`: 13 passed, включая отказ компонента, локальный повтор JSON и карты.
- В production-сборке блокируются реальные `lazy.*.js` и `explorer-component.*.js`. Работающий bootstrap показывает подсказку; recovery-кнопок нет. Тесты проверяют счётчик запросов документов при сохраняющейся блокировке, повторяют ручной reload при всё ещё недоступном JS, затем снимают блокировку и подтверждают восстановление после `page.reload()`. URL модуля остаётся тем же, без cache-busting. Поиск после reload закрыт, запрос сброшен.

## Удаление standalone pipeline — задача 2.3

- Удалены обе интеграции, их регистрации, virtual declarations, вспомогательные типы, минификатор и тесты специальных dev endpoints.
- Поиск рабочих ссылок на `retryableSearchDialog`, `retryableSettlementsExplorer`, оба virtual module, `minifyStandaloneGraph`, удалённый тип загрузчика и `graphRetry` по исходникам проекта не дал совпадений.
- `pnpm typecheck` и `pnpm build` прошли. Сборка: 354 страницы, Pagefind — 231 страница / 7836 слов, как в baseline.

## Сравнение — задача 2.2

- `pnpm exec vitest run src/compare/client/tests/explorer.test.ts`: 9 passed. Параллельная загрузка, успешная гидрация, повтор только JSON с сохранением загруженного компонента, невосстановимый локально отказ кода/hydration, приоритет JS в обоих порядках двойного отказа, resolve/reject после dispose и отсоединение root.
- Promise.allSettled наблюдает оба запроса: отказ JSON не порождает необработанный rejection и не предлагает retry до результата загрузки компонента.
- Согласованный текст «Фильтры и сортировка недоступны. Попробуйте обновить страницу» сохранён после проверки по `humanizer-ru`.

## Поиск — задача 2.1

- `pnpm exec vitest run src/scripts/tests/site-runtime.test.ts`: 19 passed. Проверены синхронное открытие/фокус, ввод до гидрации, доступное сообщение, отсутствие recovery-кнопки и reload, закрытие с возвратом фокуса, игнорирование завершения после закрытия и Astro swap.
- Удалены тесты специального cache-busting URL вместе с соответствующим загрузчиком; обычный импорт проверяется далее на production-сборке.
- `SearchDialog.svelte`: Svelte autofixer не нашёл issues; предложения заменить существующие `bind:this` не относятся к change. Согласованная фраза «Поиск не загрузился. Попробуйте обновить страницу» проверена по `humanizer-ru`: коротко называет проблему и действие, редактура не требуется.

## Baseline — задача 1.2

- После исходного `pnpm build` выполнен `pnpm exec vitest run -c vitest.search-quality.config.ts` в `apps/www`: 10 passed, 8 failed, 5 snapshot mismatches.
- Исходные ошибки рангов: «еда» — 3 вместо ≤2 (две группы); «детская площадка» — 4 вместо ≤3 (две группы); «экскаватор» — 2 вместо ≤1; «дамба» — 5 вместо ≤4.
- Расхождения snapshots затрагивают `#121 short queries`, `#184 compare settlements`, обе группы `#224 events calendar` и `status services and recent events`: актуальные snippets событий и КПП, истечение окна индексации старого status-события, количества результатов. Эти результаты получены до изменения загрузчиков.
- Для точного сравнения выдачи до/после та же матрица запущена с временным `resolveSnapshotPath` вне репозитория: `/var/folders/sb/82f4cg9n6z182c5q0k6dn3hr0000gn/T/opencode/recovery-search-baseline.snap`. Записано 14 snapshots с количеством, упорядоченными URL, snippets и highlights; SHA-256 `e50006f492b29488e6ba5569f08a4fc6a67bdbc514b0af251a29ada33fb06f8a`. Ранги по-прежнему дали 6 failed / 12 passed. Основные snapshots и assertions не менялись.
- Поисковые запросы, корпус и ранжирование этим change не меняются: используется вся существующая матрица, без новых алиасов или подгонки ожиданий.

## Baseline — задача 1.1

21 сентября 2026 года, до правок реализации, `pnpm build` прошёл: 354 страницы, Pagefind индексирует 231 страницу. Замер — холодные отдельные Chromium-сессии agent-browser, статическая production-сборка `dist/www` на `127.0.0.1:14336`. Поиск открывается на главной без ввода запроса; сравнение открывается напрямую. Перечень JS взят из Resource Timing после загрузки. Суммы учитывают общие чанки один раз в каждом сценарии. Raw/gzip/brotli — размеры готовых файлов и `.gz`/`.br`, в байтах; локальный сервер отдаёт raw, поэтому compressed — размер артефактов, не измерение HTTP-передачи.

Сторонняя Метрика исключена из сумм приложения: наблюдались `/metrika/tag.js` (260366 raw) и `/metrika/tag_phono.js` (55164 raw). Это внешние меняющиеся ресурсы, к удалению standalone-графов они не относятся.

Общие запросы (raw / gzip / brotli):

- `/static/ClientRouter.astro_astro_type_script_index_0_lang.6kryqq_V.js`: 13888 / 4762 / 4250.
- `/static/BaseLayout.astro_astro_type_script_index_0_lang.C1CwQB2p.js`: 11470 / 4183 / 3646.
- `/static/page.hqTgJEwh.js`: 47 / 67 / 51.
- `/static/prefetch.cds4f2Tp.js`: 2503 / 1134 / 969.
- `/static/preload-helper.CxFQXtKk.js`: 1342 / 730 / 607.
- `/static/lifecycle.D15KiOSI.js`: 1222 / 577 / 490.

Сценарии:

- Главная до открытия поиска: общие запросы и `/static/index.astro_astro_type_script_index_0_lang.VmuXb9G4.js` (5220 / 2592 / 2345). Всего 7 JS, **35692 / 14045 / 12358**. Поисковых ресурсов нет.
- Первое открытие поиска: добавляются `/static/SearchDialog.BewKvy97.js` (137165 / 47282 / 42552), `/search/pagefind.js` (45555 / 12849 / 11686), `/search/pagefind-worker.js` (41255 / 11901 / 10824). Всего 10 JS, **259667 / 86077 / 77420**.
- Прямое открытие сравнения: общие запросы и `/static/index.astro_astro_type_script_index_0_lang.Bc9ihoRV.js` (1478 / 774 / 683), `/static/SettlementsExplorerClient.CRJBnfK5.js` (73772 / 27858 / 25196). Всего 8 JS, **105722 / 40085 / 35892**.
