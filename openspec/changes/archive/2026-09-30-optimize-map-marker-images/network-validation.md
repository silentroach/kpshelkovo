# Сетевая приёмка маркеров

Проверка задачи 3.2 для [#887](https://github.com/silentroach/kpshelkovo/issues/887), локальная production-сборка 29–30 сентября 2026 года. **Итоговый полноразмерный fallback принят: штатная сборка без `srcset` передала 140 758 body-байт на каждом DPR1/2/3, включая zoom и 14 циклов навигации.** Ниже отдельно сохранены шесть исторических прогонов adaptive/full-only × DPR1/2/3. Это не отчёт о production nginx/TLS и не визуальная приёмка задачи 3.1; ограничение pointer-пути на дальнем zoom описано ниже.

## Сопоставимые сборки и доставка

### Окончательный выбор

30 сентября адаптивность отклонена из-за качества, а не сети: причина — в [визуальном отчёте](/openspec/changes/archive/2026-09-30-optimize-map-marker-images/quality-validation.md). Итоговая штатная сборка использует только полноразмерный `src`, без `srcset`/`sizes` и уменьшенных файлов. Она повторно собрана через `pnpm build` и проверена на том же `:14335`; прежние шесть прогонов ниже остаются результатом эксперимента, а не описанием окончательного кода.

У всех семи итоговых HTTP-ресурсов подтверждены `200`, `image/webp`, побайтовое совпадение body с emitted WebP, immutable cache и `304` по `If-None-Match`. Имена полноразмерных файлов совпадают с WebP-baseline.

Повтор окончательной сборки без полей выбора, новая session для каждого DPR:

- DPR1/2/3: холодная и накопленная передача marker body **140 758 байт**, `transferSize` **142 858** в каждом завершённом прогоне. По семь сетевых загрузок и 98 cache-hit entries; 14 клиентских возвратов, все семь семейств в реальных превью и nearby. PNG-запросов и битых ответов — 0. Zoom и все переходы добавили 0 marker-body байтов.
- Санитизированные результаты повторов сохранены вне Git как `network-final-dpr{1,2,3}.json`. Команда — `node "$TEMP/network-run.mjs" final <DPR>`; вариант `final` использует штатный `dist/www` на `:14335`, не transform-baseline. Итоговый full-only соответствует измеренному WebP-baseline; относительно PNG экономия 59 415 байт / 29,7%, дополнительная экономия адаптивности не заявляется.

- Adaptive: готовая штатная сборка `/dist/www`, `http://localhost:14335`.
- Full-only: импорт действующего `/apps/www/astro.config.ts`; дополнительный временный Vite `enforce: 'pre'` transform затрагивает только `/packages/ui/src/markers/index.ts`. Он заменяет тело helper `` `${small} 72w, ${medium} 120w, ${full} 144w` `` на `` `${full} 144w` ``. `sizes`, fallback `src`, размеры, данные, CSS и действия остаются прежними. Исходный реестр не изменялся, request routing и подмена изображений после preload не использовались.
- В Astro 7 абсолютный `--config` соединяется с app root; использован вычисленный относительный путь. Прямой outDir на другом диске привёл к `rename(EXDEV)` между prerender-каталогом и TEMP. Поэтому baseline собран в ignored `/apps/www/dist/marker-887-full-only`, затем скопирован в TEMP `full-only-site`; adaptive не перестраивался.
- Сравнение SHA-256 всех emitted CSS и побайтовое сравнение `/map/data/places.json` подтвердили идентичность CSS и набора мест. Семь полноразмерных WebP имеют одинаковые хешированные имена, размеры и SHA-256 в обеих сборках. Штатный search output скопирован из adaptive в baseline, без изменения поисковых данных.
- Оба стенда используют установленный Vite `preview`, `configFile: false`, `appType: 'mpa'`, `host: 'localhost'`, `strictPort: true`; baseline доступен на `http://localhost:14336`.
- Middleware задаёт cache headers до static delivery и удерживает HTML policy при последующем Vite HTML fallback; ETag не заменяется. Проверено HTTP:
  - `/static/`: `public,max-age=2592000,immutable`;
  - `/map/data/`: `public,max-age=300,stale-while-revalidate=300`;
  - HTML: `public,max-age=60,stale-while-revalidate=300`.
- Все семь full WebP на каждом сервере ответили `200`, `Content-Type: image/webp`, правильным `Content-Length`; запрос с полученным `If-None-Match` ответил `304`. Пример adaptive 72 px: `Apple-72.CypejdX7.webp`, `image/webp`, 8 090 байт, immutable cache.

## Браузер и сценарий

- Версии: `agent-browser 0.38.1`, Chromium/HeadlessChrome 147.0.0.0, Astro 7.3.1, Vite 8.2.2, `@playwright/test 1.63.0`, Node.js 24.20.0. CSS viewport `1440 × 1000`, DPR устанавливается **до первого открытия приложения**. Каждый вариант/DPR начинает в собственной новой session без restore/profile и заканчивается её закрытием. Cache не выключается, cache-busting URL не добавляются, SDK не мокается.
- Основные действия и наблюдения выполняет `agent-browser`: открытие, viewport, snapshots, клики, `img.currentSrc`, `img.decode()`, `PerformanceResourceTiming` и события Astro.
- Нативный wheel выполняет уже установленный Playwright 1.63 по CDP к той же CLI-сессии: в этой версии CLI `mouse wheel` отправляет event в `(0,0)` независимо от preceding mouse move и попадает в шапку, а не карту. CDP-контроллер не создаёт новый browser context, не регистрирует routes и не меняет cache policy.
- На DPR2/3 в промежуточных прогонах кластерная кнопка и затем маркер `titanic` на дальнем zoom оказались перекрыты SDK-marker: отказ pointer click подтвердили и CLI, и обычный Playwright click без `force`, в обоих вариантах сборки. Это реальное перекрытие, не подтверждённая ошибка CLI. Для подготовки кадра кластер активируется штатным keyboard focus + Enter; у перекрытого маркера выполняется настоящий wheel zoom-in в точке маркера и затем обычный проверяемый pointer click. **Сам переход маркер → карточка не заменяется keyboard или программной навигацией.** Дополнительный zoom входит в cumulative traffic. Приложение и элементы не подменяются. Неполные промежуточные прогоны не используются как завершённая приёмка.
- В каждом полном прогоне: холодное `/map/`, реальные wheel zoom out/in до CSS marker scale `0.625` и `1.300`, затем по два последовательных цикла **клик маркера → карточка → «Показать на общей карте»** для:
  - `apple-garden` — Apple;
  - `animals-wehome` — Animals;
  - `burzhuyka` — Foodtruck;
  - `titanic` — Titanic;
  - `beach` — Construction;
  - `hunting-ponds` — Fish;
  - `village-checkpoint` — Kpp.
- При кластеризации сначала активируется настоящая кластерная кнопка с нужным `data-place-ids` (DPR1 pointer click, DPR2/3 keyboard activation для обхода описанного перекрытия). Переход к карточке выполняется через реальную ссылку DOM-маркера, возврат — через самостоятельное действие карточки, не через `goto` или прямой вызов Astro navigation API.
- Важная фактическая особенность: DOM-маркер открывает карточку полной документной навигацией; **карточка → общая карта использует Astro client navigation**. Это одинаково у adaptive и full-only. На каждом client return проверяются `astro:after-swap`, неизменность `performance.timeOrigin` относительно карточки, новая рабочая карта, один `.ymaps3--map` и отсутствие повторяющихся marker href. Полный SPA-маршрут в обе стороны не заявляется.

## Метод подсчёта

- В экономию входят только семь marker families `Apple`, `Animals`, `Construction`, `Fish`, `Foodtruck`, `Kpp`, `Titanic`, по реальным resource entries и выбранным URL. Собственные JS/CSS, SDK и остальные внешние ресурсы отделены.
- Cold/body total — сумма `encodedBodySize` **только у сетевых marker entries с положительным `transferSize`**. В этих entries подтверждены `200` и `transferSize = encodedBodySize + 300`; marker revalidation в браузерном сценарии не наблюдалась.
- У marker cache hits `transferSize = 0`, хотя `encodedBodySize` сохраняет размер файла: их вклад в переданный body равен нулю. Повторное использование декодированного изображения без нового ResourceTiming entry тоже не превращается в передачу body.
- Cache accounting приведён отдельно от body/network accounting. Например, DPR1 adaptive имеет 98 cache-hit entries с суммарным `encodedBodySize` 849 828 байт, но их суммарный `transferSize` и переданный body равны **0**. Сумма `encodedBodySize` всех 105 entries — 910 530 байт — **не является** переданным трафиком. DPR1 full-only имеет те же 98 cache hits: cache `encodedBodySize` 1 970 612 байт, cache transfer/body **0**, сумма всех encoded entries 2 111 370 байт, реально переданный body 140 758 байт.
- `transferSize` приводится отдельно: в Chromium он включает нормализованные 300 байт response overhead на сетевой resource entry, а не только WebP body. Это не полный wire-byte accounting TCP/TLS.
- Сборщик удаляет query strings у всех resource URLs до сохранения. API key, response bodies SDK и HAR не записываются в отчёт, измерительные JSON и диагностические logs. Production-бандлы используют штатное build-time подключение SDK.

## Измеренные результаты

- DPR1 adaptive, завершённый полный сценарий:
  - cold и cumulative marker body: **60 702 байта**;
  - cumulative marker `transferSize`: **62 802 байта**;
  - семь uncached entries, 98 cache-hit entries; семь уникальных выбранных URL, все 72 px WebP;
  - оба zoom endpoint добавили **0 marker-body байтов**;
  - все семь preview families и все семь nearby families декодированы; 14 client returns, без дубликатов;
  - PNG, битых ответов и второй full/fallback-доставки не обнаружено.
- DPR1 full-only, завершённый полный сценарий: cold и cumulative marker body **140 758 байт**, семь full 144 px URL; zoom и повторные переходы не добавили marker-body. Экономия adaptive: **80 056 байт / 56,9%**.
- DPR2 adaptive, завершённый полный сценарий:
  - cold и cumulative marker body: **126 780 байт**, cumulative `transferSize` **128 880 байт**;
  - семь uncached entries, 98 cache-hit entries; семь выбранных 120 px URL;
  - cache-hit encoded сумма **1 774 920 байт**, cache transfer/body **0**, сумма всех encoded entries **1 901 700 байт**;
  - full-only cold/cumulative body **140 758 байт**, cumulative `transferSize` **142 858 байт**; cache accounting как у full-only DPR1;
  - после cold zoom и все 14 циклов, включая два дополнительных pointer-reveal zoom для `titanic`, добавили **0 marker-body байтов** у обоих вариантов;
  - все семь preview/nearby families декодированы, 14 client returns, без дубликатов, PNG или битых ответов;
  - экономия adaptive сохранилась: **13 978 байт / 9,9%**.
- DPR3 adaptive и full-only, завершённые полные сценарии:
  - cold и cumulative marker body: **140 758 байт**, cumulative `transferSize` **142 858 байт** у каждого варианта;
  - семь uncached entries, 98 cache-hit entries, семь выбранных full 144 px URL;
  - cache-hit encoded сумма **1 970 612 байт**, cache transfer/body **0**, сумма всех encoded entries **2 111 370 байт**;
  - оба zoom endpoint, два pointer-reveal zoom для `titanic` и все 14 циклов добавили **0 marker-body байтов**;
  - все семь preview/nearby families декодированы, 14 client returns, без дубликатов, PNG или битых ответов;
  - дополнительная экономия адаптивности относительно full-only на DPR3 — **0 байт / 0%**, как и ожидалось; она не подменяется общей экономией смены PNG на WebP.

Общие проверенные результаты каждого из шести прогонов:

- **105 marker ResourceTiming entries:** семь сетевых с `200` и ровно одним URL на рисунок, 98 cache-hit entries с нулевым `transferSize`. Во всём сценарии не появилась вторая доставка другой ширины, PNG или full `src` поверх выбранного adaptive URL.
- Все семь families наблюдались и успешно прошли `img.decode()` на каждой поверхности: обзорная карта, реальное preview и nearby. Все **1 686 image observations** в шести прогонах имеют непустой `currentSrc`, `complete: true`, положительный `naturalWidth` и не имеют decode error. Для каждого наблюдения дополнительно проверено: `currentSrc` входит в семь фактически выбранных URL соответствующего прогона.
- Во всех sampled состояниях ровно один `.ymaps3--map`, нет повторяющихся marker href. Получены 14 `astro:after-swap` с тем же `performance.timeOrigin`, что у предыдущей карточки, на каждом прогоне. Всего 15 документов: стартовая карта и 14 полных открытий карточок; возвраты к карте не создают новые документы.
- Выбранные URL на overview, preview и nearby совпадают для соответствующей family в одном DPR-прогоне. Повторное создание карт и переходы между потребителями не съели экономию.
- DPR2/3 в обоих вариантах потребовали по два pointer-reveal zoom только для `titanic`; последующий обычный pointer click успешно выполнил переход. `force`, скрытие SDK, DOM-подмена изображений и сетевой interception отсутствуют.

### Остальной трафик — не экономия маркеров

- Собственные JS/CSS отдельно: в каждом adaptive-прогоне сумма видимых ResourceTiming `transferSize` **86 558 байт**, в каждом full-only — **86 548 байт**. Это cumulative transfer accounting с cache/revalidation overhead, не размеры emitted assets и не WebP-body; их не прибавляли к экономии изображений.
- Внешние script entries (SDK и аналитика вместе) отдельно: видимый `transferSize` **555 635 байт** на каждом DPR1-прогоне и **331 857 байт** на каждом DPR2/3-прогоне. Остальные внешние page-resource entries дали соответственно **50 977** и **27 105 байт** видимого `transferSize`. Эти числа неполны и не используются для сравнения скорости или общего трафика карты.
- Page ResourceTiming не покрывает всю сеть SDK, в частности worker-загрузки тайлов; cross-origin API bootstrap/coverage также могут скрывать размеры без Timing-Allow-Origin. **Общий byte total тайлов не установлен** и не принимается за ноль/cache hit. Они полностью исключены из marker totals; SDK был настоящим, без mock или blocking.

Итог эксперимента: адаптивность прошла сетевую проверку, но отклонена по результатам визуальной приёмки 3.1. Принят полноразмерный fallback; его итоговые сетевые прогоны приведены выше. Описанное перекрытие pointer-пути на дальнем zoom не объявляется исправленным.

## Команды и временные материалы

Временный корень: `/private/var/folders/sb/82f4cg9n6z182c5q0k6dn3hr0000gn/T/opencode/marker-887`.

Из `/apps/www` baseline собран командой:

```bash
pnpm exec astro build --config "$(node -p "require('node:path').relative(process.cwd(), '/private/var/folders/sb/82f4cg9n6z182c5q0k6dn3hr0000gn/T/opencode/marker-887/network-baseline.astro.config.mjs')")"
```

Из корня workspace, с `TEMP` равным указанному временному корню:

```bash
node "$TEMP/network-preview.mjs" "$PWD/dist/www" 14335
node "$TEMP/network-preview.mjs" "$TEMP/full-only-site" 14336
node "$TEMP/network-run.mjs" adaptive 1
node "$TEMP/network-run.mjs" full 1
node "$TEMP/network-run.mjs" adaptive 2
node "$TEMP/network-run.mjs" full 2
node "$TEMP/network-run.mjs" adaptive 3
node "$TEMP/network-run.mjs" full 3
```

- TEMP содержит `network-baseline.astro.config.mjs`, `network-preview.mjs`, наблюдатель `network-probe-init.js`, capture `network-capture.js`, контроллер `network-run.mjs` и адресный CDP input helper `network-wheel.mjs`.
- Сырые sanitized результаты: `network-{adaptive,full}-dpr{1,2,3}.json`; общий проверенный итог: `network-final-summary.json`; delivery evidence: `network-delivery-check.json`. Завершённые logs: `network-{adaptive,full}-dpr1.log` и `network-{adaptive,full}-dpr{2,3}-run4.log`. Более ранние logs DPR2/3 сохраняют отказы pointer-пути и не считаются завершённой приёмкой. Эти материалы не входят в Git и не являются постоянными входами сборки/тестов.
- Production preview servers оставлены для quality-приёмки; завершение этих серверов поручено основной сессии. Собственные browser sessions закрыты в `finally`; итоговый `agent-browser session list --json` показал только sessions quality агента, без network/prep sessions. Проверка форматирования отчёта успешна; новый файл прочитан целиком, whitespace check не выдал замечаний. Поиск credential query parameters в 32 измерительных/диагностических файлах не обнаружил неснятых параметров.

## Ограничения

- Это localhost HTTP cache-модель production-сборок, **не проверка действующего nginx, CDN, TLS или production-домена**.
- Точное разрешение `srcset` — наблюдение этого Chromium при DPR1/2/3, а не постоянный контракт браузерного выбора.
- Cross-origin SDK/тайлы могут не раскрывать байты без Timing-Allow-Origin; page ResourceTiming также не охватывает все worker requests. Нулевые значения у таких ресурсов не означают cache hit или отсутствие передачи. Их трафик не включён в экономию маркеров. Собственные JS/CSS тоже не используются для вычисления image savings.
- Pointer-путь через перекрытый кластер/маркер на дальнем zoom не считается успешно проверенным. Он одинаково отказал у adaptive и full-only; источник не исправлялся в рамках сетевой оптимизации. Подготовка кадра продолжена через уже существующую доступную keyboard activation кластера либо настоящий дополнительный wheel zoom-in; принудительный click и скрытие SDK не используются.
- Ускорение загрузки/появления карты не измерялось и не заявляется. Визуальная оценка максимального размера, hover/focus, увеличенного шрифта и browser zoom относится к отдельной quality-приёмке задачи 3.1.
