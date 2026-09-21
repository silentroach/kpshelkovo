# Результаты проверок

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
