# Приёмка реализации #904

## Состояние при передаче от исполнителя

- Рабочая копия: `/Volumes/Projects/private/ok-compare-904`; план — `f8140a7d6e4f1a58dcf9a9921552fb1f50fee2c9`, база reviewer — `d3f98653ba1c25c2c5ba158948206818657f90b2`.
- Задачи 1.1–2.2 выполнены. Задача 2.3 оставлена основной сессии. Итоговая полная browser suite успешна: 16/16; история исправления устаревшего ожидания сохранена ниже.
- CSS, bootstrap, renderer, URL-логика и основные specs не изменены. Sync/archive, commit/push/PR не выполнялись.

## Проверки

Команды выполнены из корня worktree:

- `pnpm --filter @shelkovo/www exec vitest run src/compare/components/SettlementsExplorer.svelte.test.ts src/compare/components/SettlementMap.svelte.test.ts src/compare/client/tests/explorer.test.ts`: **3 файла, 72 теста прошли**. Новые сценарии проверяют обе подписи, начальный режим и ручные переключения при resize 767/768px в обе стороны; cleanup проверяется после асинхронного освобождения, затем после remount.
- `pnpm --filter @shelkovo/www test:browser:compare`: итоговый полный прогон — **16 прошли за 27,0 s**, exit 0. SSR-карточки, выключенные/готовые контролы, hydration без предупреждений, desktop без сдвига списка, оба resize-сценария и два клиентских перехода Explorer → rating → Explorer прошли. Media-подписки меняются 1 → 0 → 1 без перезагрузки документа.
- Исторический прогон — **15 прошли, 1 упал**: `aligns settlement breadcrumbs with the compare index` ожидал видимость index-крошек при 640px. По переданному основной сессией независимому заключению advisor это ожидание противоречило контракту ещё до базы; относящиеся к нему исходники и spec не изменялись. Действующий [site-navigation](/openspec/specs/site-navigation/spec.md) требует отсутствия блока без промежуточных родителей; [приёмка прежнего изменения](/openspec/changes/archive/2026-10-08-mobile-breadcrumbs/verification.md) фиксирует скрытый compare index на 390/640/768/1023px. Browser-прогон базового компонента отдельно не выполнялся.
- После разрешённой основной сессией точечной коррекции тот же browser-тест проверяет адаптивный контракт: на средней ширине 640px существующий index-nav скрыт (locator включает hidden), у посёлка видны крошки с одной доступной родительской ссылкой `/815/compare/`; на desktop сохраняются видимость обоих nav и их вертикальное выравнивание. Skip, зависимость ожиданий от фактической видимости и изменения таймаутов не добавлялись. UI/CSS/helper/specs не менялись.
- SDK-mock в browser suite дополнен только недостающими `import` и `YMapControls`: их использует действующий `/apps/www/src/lib/yandex-maps/open-maps-control.ts`. Проверки карты и камеры не ослаблялись.
- `pnpm typecheck`: **5 workspace-задач успешны**; последний запуск использовал cache, предыдущий выполнил проверку изменённого component-теста.
- `pnpm build`: **2 workspace-задачи успешны**, www — 370 страниц, media — 1 страница. Сборки одного worktree не запускались одновременно.
- Официальный Svelte MCP: документация `svelte/reactivity`, `svelte/lifecycle-hooks`; autofixer итогового `SettlementsExplorer.svelte` — без issues/suggestions. API также проверено через ctx7 при исследовании.
- Адресный Oxlint: безопасный `--fix`, затем проверка `--format=agent --deny-warnings` трёх изменённых Svelte/TS-файлов — без замечаний; проектный oxfmt применён. `git diff --check` — без ошибок.
- `pnpm openspec:validate`: **42 активных/spec items и 84 архива прошли**. Новые specs не добавлялись.

## Настоящий SDK

- После разрешения владельца запущен собственный `pnpm dev` на 4321/4322. Именованная agent-browser session: `media-query-904-a0edcb43dd77`; SDK не подменялся, ключ не выводился.
- На `http://localhost:4321/815/compare/` при 1440px настоящая подложка и 64 маркера показались автоматически. При 390px карта и SDK сначала отсутствовали; ручной показ загрузил SDK и 64 маркера.
- Desktop manual hide сохранился при 767 → 768 → 1440px; mobile manual show — при 768 → 767 → 390px. Подписи менялись независимо от карты.
- Фильтр «Дешевле» оставил 49 маркеров; кадр с отфильтрованной выборкой проверен на скриншоте. Возврат «Все» восстановил 64 маркера. После клиентского перехода на rating и обратно карта снова успешно создалась с 64 маркерами. Сохранение window-маркера подтвердило клиентскую навигацию.
- Скриншоты настоящей подложки desktop и mobile с фильтром просмотрены. Browser errors отсутствуют; console не содержит hydration/mismatch.
- Это отдельная проверка настоящего SDK; mock suite на 4330 не используется как её замена. Своя browser session закрыта, свой dev process group остановлен; 4321/4322/4330 освобождены. Порты 4331/4332 не использовались.

## Бандлы

- Свежий baseline `pnpm bundle:analyze` выполнен до изменения импортов; после реализации команда повторена. Итоговые `/docs/bundle/client.yaml` и `/docs/bundle/assets.yaml` сохранены. Исходный пересобранный baseline отличается от старых Git-отчётов; сравнение ниже относится именно к двум собственным сборкам с одинаковым `.env`.
- Explorer JS: **23219 → 23484 bytes (+265)**; Brotli **7657 → 7795 (+138)**; gzip **8748 → 8938 (+190)**. Explorer CSS неизменен: 10307 bytes.
- Новый `events`-чанк — **29 bytes**, без собственного исполняемого кода, только импорт существующего `client`. В Explorer добавились `media-query` и `reactive-value`; `create-subscriber` уже был в общем runtime. Другие реэкспорты `svelte/reactivity` имеют rendered 0.
- Всего JS-артефактов **41 → 42**, исходный размер **215741 → 216130 (+389)**. Сумма размеров передачи с выбором Brotli, иначе original: **+153 bytes**; с gzip, иначе original: **+282 bytes**. Это агрегат всех файлов сайта, не сетевой вес страницы. Набор CSS и их размеры сохранены.
- Изменения небольших shared-чанков и их сжатия включены в отчёты; уменьшение сетевого веса не заявляется.

## Материалы для reviewer

- Логи, исходные YAML, состояния настоящего браузера и PNG: `/private/var/folders/sb/82f4cg9n6z182c5q0k6dn3hr0000gn/T/opencode/media-query-904/`.
- Актуальные логи: `component-tests.log`, `browser-tests-adaptive-breadcrumbs.log`, `typecheck-final.log`, `workspace-build.log`, `baseline-build.log`, `after-build.log`, `openspec-validation.log`. История 15/1 — `browser-tests-final.log`.
- После точечной коррекции повторены полная browser suite, адресный Oxlint и diff-check. Component/typecheck/build, настоящая SDK-приёмка и bundle-сравнение сохраняют актуальность: изменились только browser-тест и внутренние документы.
- Reviewer основной сессии должен охватить весь diff от базы, включая незакоммиченные файлы, оба YAML, tasks и этот отчёт; отдельно учесть согласованную коррекцию устаревшего breadcrumb-ожидания.
