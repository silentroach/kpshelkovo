# Tasks

`design.md` пропущен по условию штатной схемы: перенос требований и согласованной границы #782 не меняет архитектуру поиска. Пропуск входил в согласованный пакет `45f11a034b42`; владелец подтвердил его при разрешении sync/archive 2026-10-05.

## 1. Единый владелец требований

- [x] 1.1 Подготовить ADR-025/035 к расширенному `search`: оставить причины выбора и ссылки, сверить правила корпуса, видимого текста, перехода к показанному excerpt и ленивой подсветки целевой страницы, lazy/a11y, алиасов и внешней индексации с delta, существующими search/status-тестами и сборщиком. Проверить сохранность специального корпуса участков, отдельных правил KB и восстановления `client-load-recovery`, исключить веса и историческую матрицу пилота из вечного контракта.
- [x] 1.2 Подтвердить prerequisite #782 по согласованному change `extract-status-lifecycle-contract` и закрепить ссылку на его владельца `status-lifecycle` после попадания зависимости в общую базу. Сверить отсутствие дубля включительного окна 30 × 24 часа и изменения его build-time расчёта, а также self-canonical/noindex/sitemap/IndexNow; сохранить #118/#122/#124 отдельными задачами, не закрепляя выбор sub-result из текущего бага как норму. Проверить весь diff на отсутствие изменений корпуса, ранжирования и алиасов; если они понадобятся, сначала согласовать объём и выполнить сравнение выдачи по `site-search`.

## 2. Общая приёмка

- [x] 2.1 Выполнить `pnpm openspec:validate` и `git diff --check`, сверить весь актуальный diff с существующим `search`, delta и зависимостью #782; получить полный первый проход reviewer, разобрать замечания и адресно повторить после исправлений по [правилам ревью](/docs/development.md#ревью-изменения-в-opencode). При недоступности reviewer явно провести основной и ponytail-проходы самостоятельно и отметить отсутствие независимого ревью.

## Проверки реализации 2026-10-05

- Временная база ревью и PR — `docs/782-adr-contracts`, точный SHA `79505fa189fd1a18a5116dfe87e849e137601e80`; подтверждён как предок HEAD. [Контракт status-lifecycle](/openspec/specs/status-lifecycle/spec.md) уже в общей базе.
- Delta содержит согласованные 6 требований и 15 сценариев. Сравнение с `45f11a034b421bf70450f88530717f5f17b0700b` подтвердило единственную правку — ссылку на владельца `status-lifecycle`. Включительное build-time окно 30 × 24 часа остаётся в существующем `search`, нового дубля нет.
- По исходникам сверены [сборщик HTML и специальных записей участков](/apps/www/scripts/build-search-index.ts), [правило актуальности статуса](/apps/www/src/lib/status/search.ts), [отбор KB](/apps/www/src/lib/kb/search.ts), [клиент](/apps/www/src/lib/search/client.ts) и [ленивая подсветка](/apps/www/src/lib/search/highlight.ts). Цепочка внешней индексации проверена от robots/canonical в шаблонах статуса до разрешённого обхода в [robots.txt](/apps/www/src/pages/robots.txt.ts), фильтра sitemap и наполнения IndexNow manifest в [Astro config](/apps/www/astro.config.ts).
- 109 существующих тестов в 11 файлах прошли командой ниже: lazy/retry, безопасный текст, передача контекста подсветки, клавиатура/фокус, устаревшие ответы, участки и алиасы, окно статуса обоих типов, годовой календарь, KB, sitemap и IndexNow.

```bash
pnpm --filter @shelkovo/www exec vitest run \
  src/lib/search/tests/client.test.ts \
  src/lib/search/tests/highlight.test.ts \
  src/lib/search/tests/raw-schema.test.ts \
  src/components/search/tests/SearchDialog.test.ts \
  src/components/search/tests/SearchDialog.integration.test.ts \
  src/scripts/tests/site-runtime.test.ts \
  src/lib/status/tests/search.test.ts \
  src/lib/status/tests/status-calendar-year-page.test.ts \
  src/lib/kb/tests/search.test.ts \
  src/lib/sitemap.test.ts \
  src/lib/tests/indexnow.test.ts
```

- Для lifecycle, страниц статуса и месячного календаря сохранён результат [приёмки #782](/openspec/changes/archive/2026-10-05-extract-status-lifecycle-contract/tasks.md): 119 тестов в 12 файлах. Их входы совпадают с базой, повторный прогон не выполнялся.
- `pnpm openspec:validate` — 28 актуальных items (27 specs и этот change) и 55 архивов, 0 ошибок; только информационные замечания о длине требований. Адресный `pnpm exec oxfmt --check`, `git diff --check` и проверка существования корневых файловых ссылок прошли.
- Собственные основной и ponytail-проходы охватили весь diff от указанной базы, включая рабочую копию: только документация; корпус, веса, алиасы, версия Pagefind, код и основные specs совпадают с базой. В ADR сохранены причины выбора и границы решений; ссылка из ADR-017 больше не направляет владельца CSP обратно в сокращённый ADR-025. Лишних абстракций и новых нормативных дублей не обнаружено.

## Границы приёмки и следующий шаг

- [#118](https://github.com/silentroach/kpshelkovo/issues/118), [#122](https://github.com/silentroach/kpshelkovo/issues/122) и [#124](https://github.com/silentroach/kpshelkovo/issues/124) остаются отдельными задачами. Для #124 текущий `SearchDialog.svelte` выбирает первый якорный sub-result; существующий тест `keeps page titles while using sub-result and tag context excerpts` отражает это расхождение. Успешный прогон не подтверждает исправление #124. Delta сохраняет согласованный основной excerpt/canonical URL и якорь только для того же фрагмента.
- Ручное сравнение релевантности по `site-search` не выполнялось: перенос не меняет правила, код или корпус. Build, typecheck, `test:search-quality`, браузер и production-проверка для документационного diff не запускались. После правок документации runtime-тесты не повторялись.
- Независимый reviewer `ses_ef336e5b1ffe2iCXsl1CrNbMFn` проверил весь diff из 8 файлов `79505fa189fd1a18a5116dfe87e849e137601e80` → `15cb315bd7c20ec037c947584f14cbb1b2e3a5c5`, включая удалённые правила и отсутствие staged/unstaged/new, с основными specs и кодом. Замечаний нет, ponytail — Lean. Владелец разрешил локальные sync/archive; адресный повтор от `15cb315bd7c20ec037c947584f14cbb1b2e3a5c5` до итогового коммита проводит координатор перед публикацией.

## Sync/archive 2026-10-05

- Получен текущий snapshot `pnpm exec openspec instructions specs --change consolidate-search-indexing-contract --json`. Основной `search` сохраняет исходный Purpose и все 10 требований / 28 сценариев в прежнем порядке; после них дословно добавлены 6 требований / 15 сценариев delta. Точное сравнение main с прежним main плюс delta прошло; новых дублей и delta-заголовков в main нет.
- Change перенесён в `openspec/changes/archive/2026-10-05-consolidate-search-indexing-contract/`. `.openspec.yaml`, proposal и delta сохранены побайтово; `tasks.md` содержит завершённые 3/3 задачи и результаты ревью. Активный список changes пуст; согласованный пропуск `design.md` сохранён.
- `pnpm exec openspec validate --specs --strict --no-interactive` — 27 specs успешно. После архивирования `pnpm openspec:validate` — 27 specs и 56 архивов, 0 ошибок; только информационные замечания о длине требований.
- `pnpm exec oxfmt --check openspec/specs/search/spec.md openspec/changes/archive/2026-10-05-consolidate-search-indexing-contract` и `git diff --check 15cb315bd7c20ec037c947584f14cbb1b2e3a5c5` прошли. В main и архиве проверены 27 корневых файловых ссылок, отсутствующих целей нет.
- Входы 109 ранее пройденных тестов, инфраструктура, ADR и артефакты #782 совпадают с проверенным HEAD; runtime-тесты повторно не запускались. Собственная сверка sync/archive подтвердила сохранность согласованного контракта; финальный независимый адресный проход остаётся координатору.

## Исправления по внешнему ревью PR #941 — 2026-10-05

- По замечаниям [4186356478](https://github.com/silentroach/kpshelkovo/pull/941#discussion_r4186356478) и [4186356484](https://github.com/silentroach/kpshelkovo/pull/941#discussion_r4186356484) в основной spec и архивную delta возвращены два существующих правила: контекст с темами новости при совпадении только по тегам и дата начала в поисковом заголовке отдельного события статуса. Добавлены сценарии tag-only результата и различения одноимённых событий. ADR-035 хранит причину датированного заголовка и ссылку на владельца требования.
- Источники правил проверены на точной базе `d9b34a4603e503b9aed16b37e4bd77e7dd40594c`: ADR-025, строка 102, и ADR-035, строка 27. Исправление подготовлено поверх `80dd4e66d3811af1be84afbc6137f63177773b3b`; перебазирование на обновлённую зависимость #782 выполняет координатор отдельно.
- Побайтовая сверка подтвердила сохранность первых 10 требований / 28 сценариев основного `search` и равенство main точной базе плюс архивной delta. Delta теперь содержит 6 требований / 17 сценариев; относительно прежнего main добавлены только два восстановленных правила и два сценария.
- Адресная команда ниже: 2 теста прошли, 49 пропущены фильтром. Проверены подготовка tag-only контекста клиентом и его вывод диалогом. Часть существующего UI-теста о sub-result продолжает отражать известное расхождение #124 и не подтверждает его исправление.

```bash
pnpm --filter @shelkovo/www exec vitest run \
  src/lib/search/tests/client.test.ts \
  src/components/search/tests/SearchDialog.test.ts \
  -t 'uses a natural context when only news tags match|keeps page titles while using sub-result and tag context excerpts'
```

- Дата начала в поисковом заголовке подтверждена статически по [маршруту события](/apps/www/src/pages/status/incidents/[year]/[month]/[entry]/index.astro) и передаче `search.title` в metadata через [BaseLayout](/apps/www/src/layouts/BaseLayout.astro). Отдельный runtime- или браузерный тест этого заголовка не запускался.
- `pnpm openspec:validate`: 27 specs и 56 архивов прошли, 0 ошибок; только информационные замечания о длине требований. Адресный `oxfmt --check`, `git diff --check` и собственное ревью полного diff исправления прошли.
- Изменения ограничены документацией. Код, корпус, ранжирование, алиасы и контракты KB, участков, внешней индексации и фаз статуса сохранены; #118/#122/#124 остаются отдельными задачами. Ручное сравнение релевантности, build, typecheck и production-проверка для этой правки не выполнялись. Независимое ревью и публикацию исправления координирует основная сессия.

## Исправления по повторному ревью PR #941 — 2026-10-05

- [4186789690](https://github.com/silentroach/kpshelkovo/pull/941#discussion_r4186789690): основной spec и delta требуют фактического включения содержательных материалов поддерживаемых типов. Сценарий обычного материала защищает возможность читателя найти опубликованный текст; отбор KB, мероприятий, статуса и специальных записей участков остаётся у прежних владельцев. Перечень типов открыт для развития, исторический набор страниц пилота не закрепляется.
- [4186789701](https://github.com/silentroach/kpshelkovo/pull/941#discussion_r4186789701): внешняя индексация HTML явно отделена от общей доставки Markdown. Владелец HTTP-политики robots — `public-markdown-delivery` из #781 / PR #935; сценарий статуса ссылается на его правило. Сохранены существующие представления, включая использование `/status/index.md` для negotiated `/status/history/`; новых companion URL правка не требует.
- [4186789712](https://github.com/silentroach/kpshelkovo/pull/941#discussion_r4186789712): главная и постоянные страницы сервисов сохраняют включение в sitemap и допустимость новых URL для IndexNow по ADR-027. Сценарий постоянной точки входа дополнен положительным результатом; правило отправки только новых страниц после публикации остаётся общим.
- Исправление подготовлено поверх локального `4c0f223d04a9fc2a62f9031c708b07176957f5c6` на точной зависимости `24ba12c2a954b3c26aa5d89cb2fd1934bea7c72b`. Первые 10 требований / 28 сценариев сохранены побайтово; main равен базе плюс delta с 6 требованиями / 19 сценариями. Все прежние 17 сценариев delta сохранены, четыре незатронутых требования не изменились.
- Адресная команда ниже: 12 тестов прошли, 36 пропущены фильтром. Проверены поисковая разметка BaseLayout и карточки контакта, исключения KB и мероприятий, включение постоянных страниц статуса в sitemap, отправка только новых допустимых URL IndexNow, общий Markdown response header и Markdown-ответы месячного/годового календарей.

```bash
pnpm --filter @shelkovo/www exec vitest run \
  src/layouts/BaseLayout.test.ts \
  src/lib/contacts/tests/contact-page.test.ts \
  src/lib/markdown/tests/response.test.ts \
  src/lib/sitemap.test.ts \
  src/lib/tests/indexnow.test.ts \
  src/lib/status/tests/status-calendar-year-page.test.ts \
  src/lib/status/tests/status-calendar-month-pages.test.ts \
  src/lib/kb/tests/search.test.ts \
  src/lib/events/tests/search.test.ts \
  -t 'BaseLayout search contract|indexes the summary and body without indexing contact methods|preserves the markdown response contract|publishes status landing pages but excludes events and archives regardless of date|submits only new indexable pages after verifying the key|keeps affected dates and targets aligned in HTML and Markdown|keeps the same days and records in HTML and Markdown|includes articles and excludes sections, noindex, and opted-out pages|keeps future, current and recently ended events, including the 30-day boundary'
```

- `pnpm openspec:validate`: 32 specs и 62 архива прошли, 0 ошибок; только информационные замечания о длине требований. Форматирование изменённых файлов, `git diff --check` и собственное ревью полного diff исправления прошли.
- Проверка файловых ссылок оставляет ровно одну отсутствующую цель: `/openspec/specs/public-markdown-delivery/spec.md`. Её правило сверено с основным spec в соседней рабочей копии #781, разделом «Обычные companions не создают отдельную поисковую копию». Остальные локальные цели существуют. Зависимость зафиксирована в proposal; публикация ожидает попадания PR #935 в общую базу либо согласованной цепочки PR. Копия владельца в этой ветке не создавалась.
- Проверки разметки не заменяют сборку production-корпуса, а тесты Markdown Response — проверку nginx-доставки. Существующая конфигурация прямого и negotiated Markdown сверена статически; браузер, `test:search-quality`, build, typecheck и production-проверки не запускались. Код и корпус не менялись; новые тесты не добавлялись. Независимое ревью, обновление зависимости #782 и публикацию координирует основная сессия.

## Модальность поиска и self-canonical — ревью PR #941 от 2026-10-05

- Read-only snapshot GitHub 18:15:11–16 UTC: review `5418770218` от 18:13:13 UTC проверил опубликованный `d204dedb6c3ea6d4b776fc56cb348427895cf32d`. Оба новых thread открыты и не устарели. Remote master — `24ad4a19a5f941119ee276611186d808bf8c8bf8`; исправление подготовлено поверх чистого локального `ce31d79534640c6c8868990fd4337ed3a590e8aa` на неизменной базе `ed0c3f60b607c95d10753de7ac17267ae5d05d4e`.
- [4187248037](https://github.com/silentroach/kpshelkovo/pull/941#discussion_r4187248037), thread `PRRT_kwDOR5IpSM6pKDAr` — confirmed. ADR-025 на указанной базе, строка 84, требовал корректную dialog semantics. [SearchDialog.test.ts](/apps/www/src/components/search/tests/SearchDialog.test.ts) проверяет нативный диалог (71–78), Escape и возврат фокуса открывшему элементу (549–594), Tab/Shift+Tab с результатами и без них (596–618). В main/delta восстановлены модальная семантика для вспомогательных технологий и удержание фокуса до закрытия; добавлен наблюдаемый сценарий. Это сохраняет доступность при замене UI без закрепления DOM-элемента или классов.
- [4187248044](https://github.com/silentroach/kpshelkovo/pull/941#discussion_r4187248044), thread `PRRT_kwDOR5IpSM6pKDAx` — confirmed. ADR-035 на той же базе, строка 35, требовал self-canonical каждой HTML-страницы. [Главная статуса](/apps/www/src/pages/status/index.astro), строка 59, и [страницы сервисов](/apps/www/src/pages/status/[service]/index.astro), строка 86, передают собственные URL; BaseLayout выводит canonical в строках 64 и 126. Требование и сценарий постоянной точки входа дополнены собственным canonical: это защищает самостоятельные страницы сервисов от объединения с главной во внешнем поиске.
- Адресная команда ниже: 8 тестов прошли, 32 пропущены фильтром. Проверены удержание фокуса, Escape и точный opener, стрелки/Enter и объявление результатов; положительный sitemap постоянных страниц и исключения; self-canonical событий при разных состояниях внутреннего корпуса. Self-canonical главной и сервисов подтверждён статически по шаблонам, route helpers и BaseLayout; ручная проверка скринридером не выполнялась.

```bash
pnpm --filter @shelkovo/www exec vitest run \
  src/components/search/tests/SearchDialog.test.ts \
  src/lib/sitemap.test.ts \
  src/lib/status/tests/status-pages.test.ts \
  -t 'opens from a delegated request and restores the exact opener|keeps Tab navigation inside the dialog with and without results|renders trusted results progressively and supports arrows and Enter|publishes status landing pages but excludes events and archives regardless of date|keeps external noindex while choosing the internal corpus'
```

- Прежние результаты 12 и 109 тестов переиспользованы: сравнение с проверенным `8375131bae476ea337edc29366edb24a7242f3f7` подтвердило отсутствие изменений runtime, тестов, конфигурации и зависимостей; обновлённая база отличается документацией и specs. Новые тесты не добавлялись, production build и браузерная приёмка не запускались.
- `pnpm openspec:validate`: 34 specs и 64 архива прошли, 0 ошибок; только информационные замечания о длине требований. Форматирование, `git diff --check` и собственное ревью актуального diff прошли. Первые 10 требований / 28 сценариев сохранены побайтово; main равен точной базе плюс delta с 6 требованиями / 20 сценариями. Прежние 19 сценариев и все предыдущие исправления сохранены; сценарий постоянной страницы дополнен self-canonical.
- Единственная отсутствующая файловая цель — `/openspec/specs/public-markdown-delivery/spec.md` в четырёх ссылках, прежняя зависимость от #935. Остальные файловые ссылки проверены; нормативный владелец HTTP-политики не дублировался. Независимое ревью и публикацию после включения владельца в общую базу координирует основная сессия.
