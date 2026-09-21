# Результаты проверок

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
