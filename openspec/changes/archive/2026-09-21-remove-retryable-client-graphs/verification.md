# Результаты проверок

## Исправление по ревью PR #774

- Подтверждено замечание [P2](https://github.com/silentroach/kpshelkovo/pull/774#discussion_r4061577429): `allSettled` задерживал показ известного отказа JS, пока JSON-запрос оставался незавершённым.
- Обработчик отказа импорта теперь сразу показывает подсказку, если root ещё подключён и не вызван dispose. `allSettled` продолжает наблюдать оба запроса; поздний результат JSON не заменяет ошибку кода и не запускает гидрацию. Новых состояний или абстракций не добавлено.
- Два регрессионных случая (поздний resolve/reject JSON) упали до исправления и прошли после него. Bootstrap suite: **11 passed**; `pnpm typecheck` прошёл; production build и два целевых browser-сценария восстановления кода/данных прошли.
- Замеры размеров ниже относятся к исходной реализации до этой точечной правки.

## Публикация — задача 4.4

- Открыт [PR #774](https://github.com/silentroach/kpshelkovo/pull/774) с `Closes #743`, label `ai`, результатами проверок и ограничениями.
- [Issue #743](https://github.com/silentroach/kpshelkovo/issues/743) обновлён: удаление retryable-графов вместо объединения; ссылка ведёт на архив change в рабочей ветке.
- Проверены через GitHub API ссылка [коммита согласования](https://github.com/silentroach/kpshelkovo/commit/1a3474d987adfa822cf6dae23cb5046de27b8eb9), опубликованный `tasks.md`, base/head PR и closing issue. PR создан как draft до заключительной проверки полностью отмеченного архива.
- Заключительная `pnpm openspec:validate`: **15 основных specs и 17 архивных changes прошли, 0 ошибок**. Все 14 задач выполнены.

## Синхронизация и архив — задача 4.3

- Создана `openspec/specs/client-load-recovery/spec.md`: три требования и семь сценариев, Purpose из delta, без разовых условий. Сравнение delta/main показало только штатную замену заголовков.
- `pnpm exec openspec validate --specs --strict --no-interactive`: 15 passed.
- Change перенесён штатной командой `pnpm exec openspec archive remove-retryable-client-graphs --skip-specs --yes` после отдельного sync. Архив: `2026-09-21-remove-retryable-client-graphs`.
- Проверка после переноса подтвердила 15 основных specs; архивный validator указал только ещё не закрытые завершающие пункты 4.3/4.4. Итоговая валидация архива выполняется после публикации и отметки 4.4.

## Ревью и соответствие spec — задача 4.2

- Проверен весь diff от `960f6578`, включая новые артефакты и удаляемые файлы; staged/unstaged/untracked проверены отдельно. `git diff --check` чистый. Временные harness удалены. Ревью сложности по `ponytail-review`: новых лишних абстракций нет, отдельный pipeline удалён.
- `pnpm openspec:validate`: 15 текущих items и 16 архивных прошли, ошибок нет.
- «Не загрузился модуль поиска»: runtime-тест и search-recovery browser — доступное сообщение, закрытие, фокус, отсутствие recovery-кнопки и автоматического reload.
- «Восстановление после сетевого отказа»: browser-сценарии поиска и сравнения — снятие блокировки и ручное обновление документа.
- «Сравнение не удалось запустить»: no-JS и fault-injection browser-сценарии — SSR-карточки и disabled controls; unit-тесты компонента/hydration и JSON.
- «Не загрузились только данные сравнения»: unit и browser — локальный повтор JSON с одним запросом компонента.
- «Не загрузились и код, и данные»: параметризованный bootstrap-тест обоих порядков завершения — приоритет подсказки обновить страницу.
- «Ошибка поисковых данных»: существующие тесты Pagefind клиента и SearchDialog — локальные повторы runtime, запроса и result data.
- «Ошибка карты»: browser-тест повторной инициализации API плюс локальная проверка фильтра при отказе карты.
- Повторный отбор требований: все три защищают долгоживущие ожидания пользователя (понятное восстановление, доступ к SSR-содержимому, локальное восстановление данных); разовые размеры и результаты проверок остаются только здесь, в основной spec не переносятся.

## Полные проверки — задача 3.5

- `pnpm test`: 7 workspace-задач прошли, `apps/www` — 207 файлов / 1442 теста, shared packages — ещё 117 тестов. Лог `recovery-tests.log` во временном каталоге сессии; сообщения об отказе API карты относятся к тестам отказа, failing tests нет.
- `pnpm typecheck`: прошёл после всех изменений кода и тестов.
- `pnpm build`: прошёл после удаления интеграций; последующие полные app-build и `pnpm test:search-quality` также успешно собрали сайт и индекс.
- Browser-команды: search recovery — 1 passed, compare — 13 passed. Известные исходные search-quality ошибки и точное совпадение нового результата с baseline описаны в 3.4.

## Dev и поисковая выдача — задача 3.4

- Ограниченный временный harness: 2 passed. Для наличия и отсутствия snapshot вызван действующий `pagefindDevSnapshot` hook с `command: dev`, его `vite.define` передан обычному Vite middleware-mode pipeline без HTTP listener. Реальный `pagefindSearchClient` через `ssrLoadModule` вернул соответственно `ready` и `devUnavailable`. Подменялась только проверка наличия `.cache/pagefind/pagefind.js`; пользовательский snapshot не менялся. Harness удалён после проверки, `pnpm dev` не запускался.
- Повтор всей матрицы с отдельным baseline snapshot: **14 snapshots совпали**, 12 passed / 6 failed (ровно прежние rank assertions).
- Полная команда `pnpm test:search-quality`: 10 passed / 8 failed, 5 snapshot mismatches — тот же исходный результат. Основные snapshots не обновлялись. Лог: `recovery-search-quality.log` во временном каталоге сессии.
- Один промежуточный запуск матрицы после browser-команд дал 18 ошибок: их `astro build` очищает индекс, но не запускает Pagefind. Повтор после полной `pnpm --filter @shelkovo/www build` восстановил индекс и дал совпадение с baseline; это ограничение последовательности команд, не регрессия поиска.
- Непроверенной ручной приёмки, обязательной для согласованного change, не осталось. Новых улучшений ранжирования этим change не заявляется.

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
