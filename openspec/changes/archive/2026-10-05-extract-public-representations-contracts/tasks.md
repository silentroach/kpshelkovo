# Tasks

`design.md` пропущен по условию штатной схемы: перенос принятых требований не меняет технический подход и не требует миграции.

## 1. Владение публичным контрактом

- [x] 1.1 Подготовить ADR-009/011/022/036 и их ссылки к владельцам `public-markdown-delivery` и `public-content-discovery`, сохранив архитектурные причины; сверить прямой/negotiated Markdown, MIME, обе оси Vary, направление alternate, deepest llms/fallback, полноту ресурсов и Content-Signal с delta и текущими response/layout/registry/nginx. Явно отделить известное расхождение #479 от требуемого поведения и не приписывать базе внедрение генератора из закрытого PR #908.
- [x] 1.2 Восстановить нормативное владение `noindex, follow` обычных companions, включая потерянное при PR #834 правило KB; проверить исключение публичных SKILL.md и отсутствие требования обратного HTTP Link у каждого direct .md. Сопоставить существующие адресные проверки с каждым сценарием и проверить ссылки разделовых документов на новых владельцев; исторические количества guides и постоянный smoke-обход не переносить в требования или CI.

## 2. Общая приёмка

- [x] 2.1 Выполнить `pnpm openspec:validate` и `git diff --check`, проверить весь актуальный diff и соответствие proposal/delta/ADR; получить полный первый проход reviewer, разобрать замечания и адресно повторить после исправлений по [правилам ревью](/docs/development.md#ревью-изменения-в-opencode). Если reviewer недоступен, явно провести основной и ponytail-проходы самостоятельно с указанием отсутствия независимого ревью.

## Свидетельства этапа реализации

Разрешение: [комментарий владельца](https://github.com/silentroach/kpshelkovo/issues/781#issuecomment-5997573547), согласованный planning SHA `1f7d2f69f35c95e2c34aeffc7dc12dfcb2d0c3a1`. База проверки после объединения веток — `0604ce84d642e29e9a809cb886111d7e70518a00`.

- Сценарии двух способов чтения, MIME и KB `noindex`: [тест response helper](/apps/www/src/lib/markdown/tests/response.test.ts), трассировка KB endpoint и direct/negotiated `location` в nginx. Это проверка исходников; реальные HTTP-ответы не проверялись, #479 остаётся отдельным исправлением.
- Сценарии отсутствующего companion и перехода из HTML: [тесты BaseLayout](/apps/www/src/layouts/BaseLayout.test.ts) и записи реестра; negotiated обратный alternate и обе оси `Vary` — по конфигурации nginx. У direct `.md` обратный alternate не потребован; `SKILL.md` имеет отдельный `location` без companion `noindex`.
- Сценарии ленты/схемы и прекращения публикации: [тесты реестра](/apps/www/src/lib/public-surface/index.test.ts), [events discovery](/apps/www/src/lib/public-surface/tests/events-discovery.test.ts) и сверка отсутствия `llms-full` в актуальном реестре и генераторах.
- Сценарии наиболее конкретного llms и корневого fallback: тесты BaseLayout покрывают оба варианта и отсутствие `llms-full`; дополнительно сверены сортировка путей в `llmsPathForPage` и разделовые nginx locations. Отдельного runtime HTTP-теста deepest llms в этом переносе нет.
- Сценарии полноты и чтения вне сайта: [тест именованных ссылок](/apps/www/src/lib/tests/llms.test.ts), [тест llms AST helper](/apps/www/src/lib/markdown/llms-document.test.ts), ручная сверка объяснений выборки/полного набора в корневом и новостном генераторах. Content-Signal сверён с `robots.txt.ts`.
- Адресный запуск `pnpm --filter @shelkovo/www exec vitest run src/lib/markdown/tests/response.test.ts src/lib/public-surface/index.test.ts src/lib/public-surface/tests/events-discovery.test.ts src/lib/tests/llms.test.ts src/lib/markdown/llms-document.test.ts`: 5 файлов, 25 тестов прошли.
- `pnpm --filter @shelkovo/www exec vitest run src/layouts/BaseLayout.test.ts -t 'markdown discovery'`: 16 прошли, 6 пропущены фильтром.
- `pnpm skills:check`: проверены 19 внешних и 4 проектных skills; `pnpm test:agent-tooling`: 2/2 прошли.
- `pnpm openspec:validate`: 27/27 актуальных и 54/54 архивных прошли; `git diff --check` от указанной базы — без ошибок.
- Самопроверка требований и отдельный проход упрощения выполнены по всему diff от указанной базы. Координатор передал чистый полный отчёт независимого reviewer `ses_ef33e0560ffeM8pNHhH1SJ4VBn`: база → `91816035c9711fbcfaa75baff32ae8bea844ebb6`, включая planning, index и worktree; замечаний нет, ponytail — Lean. Пункт 2.1 закрыт; sync/archive разрешены 2026-10-05, повторное ревью итогового состояния выполняет координатор.
- Аудит истории: `route-cache-coverage.test.ts` удалён владельцем до этой инициативы в `a7fd16c23ca16d55cce54538d82168e307b5789c` от 2026-06-09 (362 строки); перенос сохраняет контракт `Vary` и ручную проверку фактического ответа в ADR-009.
- Основные [public-markdown-delivery](/openspec/specs/public-markdown-delivery/spec.md) и [public-content-discovery](/openspec/specs/public-content-discovery/spec.md) перенесены из согласованных delta с исходными Purpose, требованиями, сценариями и исключениями.

## Завершение sync/archive

- Архив: `2026-10-05-extract-public-representations-contracts`. Proposal, обе delta и `.openspec.yaml` побайтно совпадают с проверенным HEAD; в основных specs сохранены все 8 требований и 14 сценариев. Условный пропуск `design.md` сохранён.
- После переноса `pnpm openspec:validate`: 28/28 основных specs и 55/55 архивных changes прошли. `pnpm exec oxfmt --check` для двух основных specs и каталога архива: 7 файлов прошли; `git diff --check` от базы — без ошибок.
- Проверены 84 root-relative ссылки и 5 уникальных якорей во всех 13 затронутых Markdown-файлах. Ссылки ADR и app-инструкций ведут к созданным основным specs; ссылок на прежний активный каталог change нет.
- После проверенного HEAD менялись только пути OpenSpec. Результаты адресных runtime-тестов, `skills:check` и `test:agent-tooling` выше переиспользованы: их входы не менялись. Выполнена самопроверка sync/archive и отдельный проход упрощения; итог передаётся координатору на повторное независимое ревью.
