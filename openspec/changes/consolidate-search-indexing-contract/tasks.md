# Tasks

`design.md` пропущен по условию штатной схемы: перенос требований и согласованной границы #782 не меняет архитектуру поиска.

## 1. Единый владелец требований

- [x] 1.1 Подготовить ADR-025/035 к расширенному `search`: оставить причины выбора и ссылки, сверить правила корпуса, видимого текста, перехода к показанному excerpt и ленивой подсветки целевой страницы, lazy/a11y, алиасов и внешней индексации с delta, существующими search/status-тестами и сборщиком. Проверить сохранность специального корпуса участков, отдельных правил KB и восстановления `client-load-recovery`, исключить веса и историческую матрицу пилота из вечного контракта.
- [x] 1.2 Подтвердить prerequisite #782 по согласованному change `extract-status-lifecycle-contract` и закрепить ссылку на его владельца `status-lifecycle` после попадания зависимости в общую базу. Сверить отсутствие дубля включительного окна 30 × 24 часа и изменения его build-time расчёта, а также self-canonical/noindex/sitemap/IndexNow; сохранить #118/#122/#124 отдельными задачами, не закрепляя выбор sub-result из текущего бага как норму. Проверить весь diff на отсутствие изменений корпуса, ранжирования и алиасов; если они понадобятся, сначала согласовать объём и выполнить сравнение выдачи по `site-search`.

## 2. Общая приёмка

- [ ] 2.1 Выполнить `pnpm openspec:validate` и `git diff --check`, сверить весь актуальный diff с существующим `search`, delta и зависимостью #782; получить полный первый проход reviewer, разобрать замечания и адресно повторить после исправлений по [правилам ревью](/docs/development.md#ревью-изменения-в-opencode). При недоступности reviewer явно провести основной и ponytail-проходы самостоятельно и отметить отсутствие независимого ревью.

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
- Пункт 2.1 остаётся открытым: независимый первый проход reviewer вызывает координатор. По его указанию sync/archive, push и PR ожидают этого ревью; `design.md` намеренно отсутствует. Собственная проверка не заменяет независимое ревью.
