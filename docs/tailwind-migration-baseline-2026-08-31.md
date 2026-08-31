# Baseline Tailwind-контура перед миграцией

Этот документ фиксирует наблюдаемое состояние Tailwind-контура до миграции по
[задаче «Снять проверяемый baseline Tailwind-контура»](https://github.com/silentroach/kpshelkovo/issues/468).
Это не целевая архитектура, не performance-бюджет и не план работ. Решения и
backlog живут в
[карте отказа от Tailwind](https://github.com/silentroach/kpshelkovo/issues/460),
а принятая граница владения закреплена в
[ADR-034](decisions/034-native-css-architecture.md).

## Снимок

- Время: `2026-08-31T11:23:38Z`.
- Commit: `e74171cb43c5ab341ff716d310dfb09dffdea6ad`.
- Исходное рабочее дерево было чистым.
- Локальная среда: Node `26.8.1`, pnpm `11.9.0`, macOS.
- CI использует Node 24 и pnpm из поля `packageManager` в корневом
  `package.json`.
- Тот же commit успешно собран и опубликован в
  [GitHub Actions run 33335896045](https://github.com/silentroach/kpshelkovo/actions/runs/33335896045).

## Зависимости и сборка

Tailwind объявлен на трех уровнях:

- корневой `package.json`: `tailwindcss` и `@tailwindcss/vite` версии
  `^4.3.3`;
- `apps/www/package.json`: те же две dev-зависимости;
- `packages/ui/package.json`: те же две dev-зависимости для visual fixtures.

`pnpm-lock.yaml` разрешает `tailwindcss`, `@tailwindcss/vite` и
`@tailwindcss/oxide` в версию `4.3.3`. Проектных `tailwind.config.*`,
`postcss.config.*` и `vite.config.*` нет.

Production-сборка `apps/www` подключает `@tailwindcss/vite` в
`apps/www/astro.config.ts`. Плагин работает и в static build, и в dev-режиме.
CSS и JavaScript попадают в `dist/site/static`, после чего app script копирует
результат в `dist/www`. `astro-compressor` создает gzip с уровнем 9 и Brotli с
quality 11.

Пять отдельных visual fixture-приложений тоже подключают Tailwind Vite plugin:

- общий app fixture config
  `apps/www/tests/config/astro-visual-fixture.ts` обслуживает status timeline,
  news event card и sticky table;
- `packages/ui/tests/breadcrumbs-visual/astro.config.ts`;
- `packages/ui/tests/icons-visual/astro.config.ts`.

Удаление plugin из production config само по себе не завершит миграцию:
fixture-конфиги и package dev-зависимости образуют отдельные Tailwind-границы.

`apps/media` Tailwind не использует. Его 404 импортирует отдельный
`@shelkovo/ui/standalone-error.css` со своим минимальным reset.

## CSS entry graph

Главный CSS-граф начинается в `apps/www/src/layouts/BaseLayout.astro`:

1. `@shelkovo/ui/styles.css` загружается первым.
2. App-owned `apps/www/src/styles/site.css` загружается вторым.
3. Astro и Svelte добавляют scoped CSS chunks для отдельных routes и
   компонентов.

`packages/ui/styles.css` одновременно выполняет несколько ролей:

- импортирует `tailwindcss`;
- через `@source './src/**/*.{astro,svelte,js,ts}'` включает utilities из
  shared-компонентов;
- объявляет `@custom-variant dark`;
- хранит Tailwind `@theme`;
- хранит обычные `:root` tokens и `.dark` overrides;
- дополняет Preflight через собственный `@layer base`;
- публикует semantic `ui-*` primitives и contracts generated Markdown.

В исходниках не найдены `@apply`, `@utility`, `@plugin`, `@config`,
`@reference`, safelist и `@source inline(...)`.

В `apps/www/src` находятся 18 `<style>` blocks в 17 файлах. Среди них есть
route-scoped стили страниц news, regulation, compare, meetings и status, а
также component-scoped стили карт, site navigation, timeline и calendar.
`packages/ui/src/NotFoundView.astro` содержит еще один scoped block. Поэтому
часть CSS закономерно выходит отдельными route/component chunks, а не входит в
главный Tailwind asset.

## Generated production CSS

Локальная production-сборка выполнена командой:

```bash
pnpm install --frozen-lockfile
pnpm --filter @shelkovo/www build
```

В `dist/www/static` получено 14 CSS assets:

- суммарный raw-размер: `145737` bytes;
- суммарный gzip-размер: `28667` bytes;
- суммарный Brotli-размер: `24086` bytes;
- SHA-256 canonical manifest: `c98eb9a78bec1fc0e2fd939e7a176effdb472cf2f1144699c2947fc9dd8e27b0`.

Главный asset:

- файл: `BaseLayout.D6GwCCJj.css`;
- raw: `112260` bytes;
- gzip: `19473` bytes;
- Brotli: `16378` bytes;
- SHA-256: `a0781a8c490c751fa408666fe52e512e37bdab45e82141aea4604d9a1194ccde`.

В главном asset присутствуют Tailwind layers `properties`, `theme`, `base`,
`components` и `utilities`, 55 правил `@property` и 9 `@font-face`. Tailwind
banner и source maps в production output отсутствуют.

Текущая геометрия, которую нужно сохранить при первом переносе tokens:

- generated `--radius-sm`: `0.25rem`;
- generated `--radius-md`: `0.375rem`;
- generated `--radius-lg`: `0.5rem`;
- generated `--radius-xl`: `0.75rem`;
- emitted `.rounded-full`: `2147483647px`;
- semantic CSS дополнительно использует прямые значения `0.35rem`, `0.5rem`,
  `1rem` и `999px`.

В source CSS пока нет канонических `--radius-*`. Значение будущего
`--radius-full` может быть визуально эквивалентным pill radius, но первый перенос
не должен незаметно менять форму существующих controls и badges.

Проверка опубликованного commit по 289 sitemap URLs обнаружила 13 CSS assets,
а отдельная проверка 404 довела число до тех же 14. Raw-сумма и главный asset
совпали с локальной сборкой. Суммарный Brotli в deployment равен `24092` bytes;
отличие локализовано в сгенерированном 404 chunk. Поэтому размер CSS здесь
служит диагностическим baseline, а не жестким байтовым контрактом между
разными версиями Node и окружениями сборки.

Manifest можно воспроизвести после build без запуска dev server:

```bash
node --input-type=module <<'NODE'
import { createHash } from 'node:crypto';
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const root = resolve('dist/www');
const staticRoot = join(root, 'static');
const digest = (value) =>
  createHash('sha256').update(value).digest('hex');

const rows = readdirSync(staticRoot, { recursive: true })
  .map(String)
  .filter((name) => name.endsWith('.css'))
  .map((name) => {
    const file = join(staticRoot, name);
    const data = readFileSync(file);
    const gzip = `${file}.gz`;
    const brotli = `${file}.br`;

    return {
      path: `/${relative(root, file).split(sep).join('/')}`,
      rawBytes: data.byteLength,
      gzipBytes: existsSync(gzip) ? statSync(gzip).size : undefined,
      brotliBytes: existsSync(brotli) ? statSync(brotli).size : undefined,
      sha256: digest(data),
    };
  })
  .sort((left, right) => left.path.localeCompare(right.path));

const manifest = `${rows
  .map((row) =>
    [
      row.path,
      row.rawBytes,
      row.gzipBytes ?? '',
      row.brotliBytes ?? '',
      row.sha256,
    ].join('\t'),
  )
  .join('\n')}\n`;

console.log(
  JSON.stringify(
    {
      assets: rows.length,
      rawBytes: rows.reduce((sum, row) => sum + row.rawBytes, 0),
      gzipBytes: rows.reduce(
        (sum, row) => sum + (row.gzipBytes ?? 0),
        0,
      ),
      brotliBytes: rows.reduce(
        (sum, row) => sum + (row.brotliBytes ?? 0),
        0,
      ),
      manifestSha256: digest(manifest),
      files: rows,
    },
    undefined,
    2,
  ),
);
NODE
```

## Source scanning и runtime classes

Tailwind автоматически находит полные class literals в app sources, а
`@source` в shared stylesheet явно добавляет `packages/ui/src`. Это
подтверждается app-only rules в production CSS, включая `min-w-[58rem]`,
`pt-1.5` и `text-danger-text`.

Сборка utility names из фрагментов вроде `` `text-${tone}` `` или
`` `grid-cols-${count}` `` не найдена. Условные classes в Astro и Svelte
выбираются из полных literals.

Нужно учитывать четыре отдельных механизма:

1. `apps/www/src/lib/reglament/calculator-editor.ts` во время исполнения
   присваивает Tailwind classes `block pt-1.5`. Они попадают в CSS только
   потому, что полная строка видна source scanner.
2. Карты, status timeline и year calendar создают или переключают собственные
   runtime classes. Их global/scoped selectors находятся рядом с компонентами,
   а не генерируются Tailwind.
3. `packages/markdown` и app Markdown processors генерируют classes для heading
   anchors, TOC, figures, GFM task lists, file links и content diff. Их CSS API
   сейчас в основном живет в `packages/ui/styles.css`.
4. `Link.svelte`, `LinkWithIcon.astro`, `StarRating.astro`,
   `ResourceLink.astro`, `BaseLayout.astro` и compare table types принимают
   строковые class props. Текущие producers передают полные literals, но сами
   props остаются открытой внешней границей.

У `BaseLayout` есть optional `bodyClass`, но текущих call sites нет. Это не
подтвержденная production-зависимость.

## Зависимость от Preflight

`@import 'tailwindcss'` включает Preflight в главный asset. В сгенерированном
CSS подтверждены:

- общий `box-sizing: border-box` для элементов и pseudo-elements;
- reset margin и padding;
- reset headings и lists;
- наследование шрифта и нормализация form controls;
- нормализация media, table и `[hidden]`.

Собственный `@layer base` в `packages/ui/styles.css` эти правила не заменяет.
Он задает border color, typography, body colors, heading typography, selection
и focus-visible. В частности, он не задает общий box model, `body { margin: 0 }`
или полный reset controls.

`.ui-prose` явно восстанавливает list markers, task lists, tables, images и code
blocks после глобального reset. Это делает порядок `Preflight -> app base ->
semantic primitives` частью текущего поведения.

Отдельный `standalone-error.css` подтверждает границу: приложение media не
получает Preflight и поэтому само задает `box-sizing` и `body { margin: 0 }`.

Следовательно, удаление Tailwind import без replacement reset вернет browser
defaults на `apps/www`. Точный состав replacement и момент его включения должен
решаться отдельно; baseline не выбирает реализацию.

## Visual и behavior coverage

В репозитории есть пять Playwright visual suites:

- 21 test case;
- 17 вызовов `toHaveScreenshot` и 17 Darwin PNG baselines;
- только Chromium, light color scheme и device scale factor 2;
- отдельные fixtures для status timeline, news event card, sticky tables,
  breadcrumbs и части icon/marker catalog.

Все screenshots снимают fixture routes. Screenshot baseline реальной
production-страницы отсутствует.

Контрольный запуск на baseline commit показал, что visual coverage уже частично
неработоспособен:

- sticky table: 6 tests passed;
- icon catalog: 1 test passed;
- status timeline не дошел до тестов из-за ошибки fixture prerender в
  `getTimelineDayKey`;
- news event card не дошел до тестов из-за ошибки fixture prerender
  `Cannot read properties of undefined (reading 'slice')`;
- breadcrumbs собрался, но preview process завершился до готовности сервера.

Итого выполнены и прошли 7 visual cases в двух suites. Остальные 14 cases в
трех suites не были запущены и сейчас не могут служить parity gate, хотя их 11
PNG baselines остаются в репозитории.

Четыре production browser suites содержат еще 22 test case без screenshots:

- home hero: 3;
- site header accessibility: 8;
- status calendar focus/navigation: 7;
- compare controls and layout stability: 4.

Они проверяют behavior, accessibility и отдельные computed geometry/style
contracts, но не общий внешний вид route family. Все 22 browser cases прошли
на baseline commit.

Обычный `pnpm test` запускает Vitest. Основной CI не запускает ни browser, ни
visual Playwright suites. Lighthouse отдельно проверяет шесть routes по
расписанию или вручную, а score thresholds настроены как warnings.

### Существенные пробелы

- Три из пяти visual suites не запускаются на baseline commit.
- Нет систематических page screenshots для home, news, status, compare,
  regulation, map, sarafan, reviews, meetings, people, KB и 404.
- Нет visual catalog для `ui-prose`, typography, controls, links, footer,
  error pages, badges, pills и остальных shared primitives.
- News event fixture проверяет default `wide`, хотя production использует
  `compact`.
- Status timeline visual suite не проверяет mobile range.
- Icon fixture не включает все экспортируемые icons и markers.
- Map tests используют mocked Yandex Maps; browser rendering карты не покрыт.
- Regulation calculator не имеет production browser coverage.
- Baselines существуют только для Darwin, а CI работает на Ubuntu.
- Несколько unit tests проверяют точные Tailwind class names. При миграции их
  нужно заменить проверками поведения или семантического CSS API, а не считать
  визуальным parity gate.
- Visual fixture harness сам зависит от Tailwind, поэтому его нужно мигрировать
  до удаления plugin и зависимостей.

## Команды проверки

Стандартные проверки:

```bash
pnpm typecheck
pnpm test
pnpm build
```

Production browser suites:

```bash
pnpm --dir apps/www run test:browser:home-hero
pnpm --dir apps/www run test:browser:header-a11y
pnpm --dir apps/www run test:browser:status-calendar-focus
pnpm --dir apps/www run test:browser:compare
```

Visual suites:

```bash
pnpm --dir apps/www run test:visual:status
pnpm --dir apps/www run test:visual:news-event
pnpm --dir apps/www run test:visual:sticky-table
pnpm --dir packages/ui run test:visual:breadcrumbs
pnpm --dir packages/ui run test:visual:icons
```

Эти девять Playwright-команд не агрегированы общим script и не входят в
обычный CI. Перед первым локальным запуском нужен Chromium:

```bash
pnpm --dir apps/www exec playwright install chromium
```

Повторный source-аудит:

```bash
git grep -nE '@(import|source|custom-variant|theme|layer|apply|utility|plugin|config|reference)' -- '*.css'
git grep -nE "className[[:space:]]*=|classList\.(add|remove|toggle|replace)|setAttribute\([[:space:]]*['\"]class" -- apps packages
git grep -nE '(bg|text|border|ring|fill|stroke|grid-cols|col-span|p[trblxy]?|m[trblxy]?|w|h|gap)-\$\{' -- apps packages || true
```

## Что baseline открывает дальше

Этого снимка достаточно, чтобы следующие решения опирались на проверяемые
границы:

- replacement Preflight должен покрыть фактически используемый reset, а не
  копировать Tailwind целиком;
- parity gate не может полагаться только на текущие screenshots;
- generated/runtime classes и class props нужно учитывать отдельно от static
  utility markup;
- удаление зависимостей возможно только после production app и всех visual
  fixtures;
- raw и compressed CSS size следует сравнивать как диагностику на одинаковом
  toolchain, но не использовать как жесткий бюджет миграции.
