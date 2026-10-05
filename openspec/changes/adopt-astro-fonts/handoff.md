# Точка продолжения — 5 октября 2026

Change остаётся активным; ориентир — [tasks.md](/openspec/changes/adopt-astro-fonts/tasks.md). Выполнены 1.1 и 2.5. Остальная реализация частично готова, но приёмка заблокирована доступностью Fontsource.

## Разрешение и Git

- Владелец разрешил реализацию подготовленного change 3 октября; 5 октября попросил продолжить её с параллельными субагентами.
- Рабочая копия: `/Volumes/Projects/private/ok-compare`, ветка `feat/907-astro-fonts`.
- База `origin/master`: `b445f5fbf6cd41a49e766f19c39c3ba273872eb0`. Коммит согласованного плана: `7514aa700b3e061ffe22a5d8d3abf403ba78e17c`, опубликован в рабочей ветке. После него сверять актуальные HEAD и `git status`, включая новые файлы.
- [Отметка разрешения в #907](https://github.com/silentroach/kpshelkovo/issues/907#issuecomment-5989543362) ссылается на этот коммит и change. PR пока нет.
- Подпись Git обязательна и теперь работает; настройки подписи не менялись. Проверка доверия подписи через `%G?` требует локального `gpg.ssh.allowedSignersFile`, которого в среде нет.

## Что сохранено

- [Отчёт baseline](/docs/research/2026-10-03-astro-fonts-acceptance.md) содержит исторические URL, условия, размеры и ограничения Chromium/CPU/CSP. Прежний temp-каталог `astro-fonts-907/` утрачен: исходные PNG, сырые замеры, manifest и скрипты недоступны.
- Сохранившиеся корневые `dist/www` и `dist/media` скопированы до повторных сборок в `/private/var/folders/sb/82f4cg9n6z182c5q0k6dn3hr0000gn/T/opencode/astro-fonts-907-resume/recovered-baseline/`: 5611 и 7 файлов. Новый `manifest.json` фиксирует их SHA-256. После failed builds все файлы корневого `dist` остались идентичны этой копии; совпадение с утраченным старым manifest не подтверждено.
- Compare уже загружает семь WOFF2: седьмой — Fira Sans 600 latin-ext для `₽`. На остальных www-сценариях шесть, на media два. Для сравнения это исходное поведение, бюджет не расширяли.
- Общие определения, build-time наборы, head-компонент и server-side проверка обязательной матрицы добавлены в `packages/ui`. Production www/media и шесть visual-хостов переведены на Fonts API и semantic variables.
- `FontPreloads.astro`, его export и неиспользуемые `@fontsource/*` зависимости удалены после проверки всех потребителей; lock-файл обновлён штатно. UI `sideEffects: ["**/*.css"]` сохранён, snapshots не менялись.
- Unit markup-тесты отделены от font IO в `vitest.config.ts`: test-only integration отключает Fonts API, alias подставляет пустой `src/test/Fonts.astro`. Реальные policy/guard-тесты сохранены; production и visual hosts используют настоящие Fonts API.

## Проверки 5 октября

- `pnpm lint`, `pnpm typecheck`, `pnpm test` прошли после исправления test seam; www — 229 файлов / 1821 тест. Логи: `astro-fonts-907-resume/{lint,typecheck,test}-offline-fixed.log`. Остальные пакеты тестов используют актуальные Turbo cache hits.
- 28 адресных Font Budget / font-data / BaseLayout тестов прошли с запрещёнными `fetch`, `http` и `https`, без попыток обращения Fontsource. Лог: `font-tests-offline-hook.log`; interceptor: `no-network.mjs`. Это результат task 2.5, а не проверка готовых font assets.
- `pnpm openspec:validate` прошёл: 26 активных items и 54 архива. После окончательных правок артефактов повторить структурную проверку.
- Production `pnpm bundle:analyze` и `pnpm --filter @shelkovo/media build` завершились exit 1: metadata `TypeError: terminated`, `read ETIMEDOUT`; guard остановил prerender при нуле faces. Логи: `astro-fonts-907-resume/{www,media}-build.log`. `apps/*/dist/site` — промежуточные failed outputs, не для preview или публикации.
- Raw промежуточный client report сохранён в `astro-fonts-907-resume/intermediate-bundle/`. `docs/bundle/*.yaml` нормализованы существующим `bundle-assets.ts` по оставшемуся baseline `dist`, не являются after-отчётами. Итоговый `pnpm bundle:analyze` и сравнение ещё нужны.
- Browser baseline восстановлен: 12 normal PNG/JSON (шесть URL, два viewport), старые font faces, геометрия и стоимость совпали с историческим описанием. Скрипты и `report.md` — `astro-fonts-907-resume/browser-acceptance/`. Cold/slow, fallback, warm/router и latin-ext отложены до готового after; prepared-ветви скриптов ещё не проверены запуском. WebKit через установленный CLI недоступен, preview без CSP. Собственные browser sessions и серверы закрыты.
- Статически проверены nginx asset locations `/static/` и `/_media/`, разрешения собственного origin в `font-src` и inline CSS в `style-src`. Конфиги не менялись. Проверка новой сборки с enforced CSP ещё нужна; обычный preview её не заменяет.
- Visual Breadcrumbs: 5/5 passed; остальные пять хостов заблокированы тем же metadata timeout (Sticky Table дополнительно дошёл до отказа guard). Все 31 PNG-эталоны неизменны. Логи: `/private/var/folders/sb/82f4cg9n6z182c5q0k6dn3hr0000gn/T/opencode/astro-fonts-907-visual-20261005.Xi6Rze/`; `npm-preserved/` содержит девять исходных WOFF2 и manifest, 237768 bytes. Task 2.4 ещё не закрыта.
- Reviewer выполнил первый полный проход и адресный повтор по cleanup, test seam и документации. Подтверждённых ошибок в коде нет; устаревшие пути/Git и raw YAML исправлены. Baseline-only YAML нельзя считать итоговыми after-отчётами: перед PR заменить их результатом успешного `bundle:analyze`. Runtime-готовность reviewer не подтверждал. `ponytail-review` не нашёл лишней сложности; после приёмки и sync/archive нужен следующий повтор.

## Следующий шаг

1. Прочитать актуальные артефакты и восстановить состояние по `pnpm exec openspec instructions apply --change adopt-astro-fonts --json`; сверить файлы и результаты ниже.
2. Восстановить доступность штатного Fontsource и получить успешную production/clean-сборку. Не подменять кеш, провайдер или metadata ради зелёной проверки; смена подхода требует согласования.
3. Завершить матрицу clean/fault, пять оставшихся visual-хостов и browser-before/after по design. Проверить реальные asset-префиксы и enforced CSP. Переснять baseline на одинаковых с after условиях: старые raw-измерения утрачены.
4. Сохранить итоговые bundle YAML после успешной сборки; завершить проверки и адресный reviewer. Sync/archive и PR ещё не выполнялись.
