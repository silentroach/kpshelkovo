# Astro Fonts: приёмка 5 октября 2026

Результаты для [#907](https://github.com/silentroach/kpshelkovo/issues/907) и [adopt-astro-fonts](/openspec/changes/archive/2026-10-05-adopt-astro-fonts/design.md). Исторический baseline и его восстановление описаны в [отчёте 3 октября](/docs/research/2026-10-03-astro-fonts-acceptance.md).

**Результат принят владельцем с явным компромиссом mobile KB.** Media 404 исправлена, loaded-типографика и шрифтовой бюджет сохранены. Cold/slow CLS mobile KB вырос **0 → 0,063941**; владелец принял этот результат ради подключения без preload и более раннего текста в проведённых замерах. Измерения не изменены, отсутствие регрессии CLS не заявляется. Проверки и адресное ревью завершены; основной spec синхронизирован, change архивирован.

## Решение владельца после диагностики mobile KB

5 октября владелец ответил «да» на предложение принять измеренный компромисс и закончить без дальнейшего исследования fallback. Сохраняются текущие исходники и `production-final-media-fallback`: optimized fallback www, обычный системный fallback media, `swap` и отсутствие font preload. Новая сборка или повтор браузерной матрицы не нужны: код после измерений не менялся.

Узкая диагностика уточнила источник сдвига: −28 px относится к началу текстового узла внутри `<strong>`, не к началу всего абзаца. H1 и первый абзац сохраняют y/height, колонка — 318 px. Во fallback prefix + начало жирной вставки занимают 325,53 px, после Cyrillic — 309,74 px; текст переносится между строками. Native Astro 7.3.5 маршрутизирует 600 к normal local fallback; пробелы/NBSP меняются также после Latin. Отключение optimized fallback www в единственном диагностическом probe повысило CLS до 0,184008 и не применялось.

Принят именно production-результат N=3: mobile KB FCP/LCP 552 (548–556) → 392 (388–392) ms; CLS 0 → 0,063941 (0,060027–0,064232). Это не универсальный выигрыш по скорости и не гарантия нулевого CLS. `astro-fonts-907-kb-mobile-root-cause-20261005/report.md` хранит диагноз, один probe, исходные измерения и ограничения; прежний `astro-fonts-907-final-acceptance-20261005/acceptance.json` остаётся **NOT ACCEPTED по первоначальному критерию**, а последующее разрешение зафиксировано здесь и в change.

## Согласованное исключение для media 404

После предложения выключить `optimizedFallbacks` только у media владелец ответил «давай». Оба media-семейства получили `optimizedFallbacks: false`; www и визуальные стенды остались с `true`. Сохранены Fontsource-провайдер, два Cyrillic WOFF2, `swap`, `system-ui` и `Georgia, serif`, отсутствие preload и клиентских скриптов. Proposal/design/spec/tasks и документация подключения согласованы с этим исключением. Font Budget test больше не требует `true` для всех хостов; проверка бюджета, весов, styles, формата и display сохранена, поведение fallback проверяется браузером.

Новые `pnpm lint`, `pnpm typecheck`, `pnpm test`, обе production-сборки и `pnpm openspec:validate` прошли. Www — 229 файлов / 1820 тестов; 27 адресных font/layout тестов отдельно прошли с запрещёнными fetch/HTTP/HTTPS. Логи — `astro-fonts-907-resume/*-media-fallback-final.log` и `font-tests-media-fallback-final-offline.log`.

Отдельная сохранённая сборка — `astro-fonts-907-resume/production-final-media-fallback/{www,media}`, рядом manifest, source-inputs SHA-256 и итоговые bundle YAML. Www: 5610 файлов, девять WOFF2 / 237768 bytes; media: семь файлов, два WOFF2 / 32516 bytes. Относительно `production-after-no-preload` у media изменился только `404.html`. Www CSS, JS, WOFF2 и HTML шести приёмочных URL совпали; изменились зависящие от времени сборки status-listing, calendar/news/search данные. Полная браузерная проверка связала идентичные входы с прежними валидными измерениями и дополнила оставшиеся сценарии; прежние результаты не перезаписывались.

### Полная матрица последнего candidate

Отчёт — `/private/var/folders/sb/82f4cg9n6z182c5q0k6dn3hr0000gn/T/opencode/astro-fonts-907-final-acceptance-20261005/report.md`. Рядом `acceptance.json`, `coverage.json`, SHA bindings, raw JSON/PNG и проверенный manifest 215 файлов / 123 JSON / 70 PNG. Normal охватывает 14 URL × две ширины × две версии; cold/slow — 36 навигаций; delay/fail — все 48 baseline/candidate сценариев. Идентичные прежние captures привязаны по SHA-256; новые numeric-прогоны не имели delivery failures, исключений или переснятий ради лучших цифр.

- **Media прошла:** normal PNG побайтно равны baseline обеих ширин, delay-геометрия и переносы сохранены. При WOFF2 503 текст читается и ссылка получает click. Mobile delay CLS 0,0005208618 → 0,0004635885; desktop 0,0001390577 → 0,0001390577. Два WOFF2 / 32516 bytes; optimized local definitions, scripts и preload — ноль. Task 2.3 закрыта.
- **Loaded-типографика прошла:** все 28 page/viewport сравнений имеют равную выбранную H1/prose/paragraph геометрию и переносы. Www 404 desktop сохраняет историческую разницу 28 PNG-пикселей при равной выбранной геометрии.
- **Бюджет, кеш и CSP прошли:** семейства/веса/subsets, байты и SHA-256 прежние; ноль font preload во всех 371 HTML; warm transferSize 0; ClientRouter fonts 6→6; видимый `ā` добавляет только Fira Sans 400 latin-ext / 46400 bytes. Шесть свежих enforced-CSP просмотров — ноль нарушений, same-origin HTTP 200 `font/woff2` под действующими prefixes, без дублей/Fontsource-запросов. Это не проверка настоящего nginx/TLS/S3 runtime.
- **Принятый компромисс — mobile KB:** ранний fallback появляется до завершения Cyrillic fonts, затем меняются переносы; начало `<strong>` сдвигается на −28 px при неизменной ширине колонки 318 px и неизменных y/height первого абзаца. Baseline завершал Cyrillic до FCP. Подробности — `kb-mobile-cls-regression.json` и последующее уточнение в root-cause отчёте. Исходный критерий отсутствия регрессии нарушен; решение владельца явно принимает измеренный результат.

Медиана (min–max), ms; baseline → candidate, N=3:

- Главная mobile: FCP 544 (540–556) → 388 (384–392); LCP 1116 (1084–1140) → 1032 (1020–1176); CLS 0 → 0.
- Главная desktop: FCP 484 (480–532) → 388 (384–388); LCP 1404 (1380–1408) → 1496 (1328–1528); CLS 0,000327 (0,000039–0,000327) → 0,000176, без разброса.
- Новость mobile: FCP/LCP 720 (704–724) → 548 (544–552); CLS 0,059203 (0,058771–0,059203) → 0,058908 (0,058730–0,058908).
- Новость desktop: FCP/LCP 732 (724–736) → 548 (540–556); CLS 0,060380 (0,060380–0,063349) → 0,004196 (0,003621–0,004229).
- KB mobile: FCP/LCP 552 (548–556) → 392 (388–392); **CLS 0 → 0,063941 (0,060027–0,064232)**.
- KB desktop: FCP/LCP 564 (548–584) → 400 (392–556); CLS 0,031807 → 0,019285 (0,019206–0,021578).

Home desktop LCP +92 ms по медиане остаётся неопределённым сигналом: диапазоны перекрываются, один candidate-прогон быстрее всех baseline. CPU не изолирован, WebKit недоступен; абсолютный выигрыш по скорости не заявляется. Все валидные значения сохранены, собственные previews/browser sessions закрыты, чужие процессы не затронуты.

Стоимость последнего candidate: www inline font CSS — 10953 raw bytes / 42 faces; совокупный Brotli HTML + внешний CSS вырос на **262–309 bytes** по 13 www-представителям. Media actual raw HTML **3122 → 3399 bytes**; внешнего CSS и sidecars нет. Вычисленные gzip9 1419 → 1495 / Brotli11 1125 → 1197 — потенциал сжатия, не фактическая передача. Все 44 JS SHA-256 равны recovered baseline; Git YAML расхождение runtime остаётся прежним reporting discrepancy. `costs.json` и оба inventories содержат полные per-page данные. Source/build/bundle/стоимость подтверждают task 3.2, но не успешность 3.1.

## Последующая правка: без preload и со стабильной prose-шириной

После обсуждения владелец явно отменил font preload. Из общего `Fonts.astro` удалён prop выбора предзагрузки; оба штатных `<Font>` теперь всегда получают `preload={false}`. Из `BaseLayout` убран прежний prop, удалены выборочные preload-константы, их export и тест отменённой политики. Бюджет семейств/весов/subsets и проверка запрещённых весов сохранены. Отсутствие предзагрузок проверяется по настоящему production HTML и браузерным запросам, не по пустому unit-fixture.

Также внесён подтверждённый диагностикой KB fix: общие `.ui-prose`/`.ui-prose-narrow` используют 39.06/36.27em вместо 70/65ch. Это эквиваленты loaded Fira Sans 400 при advance цифры `0` 558/1000 em, сохраняющие масштабирование и итоговую ширину; до загрузки Latin колонка больше не зависит от резервного `ch`. В CSS и дизайн-гайде указана связь с метриками шрифта. Кандидат-overlay сохранил loaded PNG KB/news обеих ширин и снизил desktop KB CLS 0,0490755997 → 0,0000584445 в трёх парах. Его proof — `astro-fonts-907-kb-cls-20261005/report.md`; это диагностика, не приёмка новой production-сборки.

Новые lint/typecheck/tests/структурная проверка и обе production-сборки завершились успешно. Www — 229 файлов / 1820 тестов; 27 адресных Font Budget/font-data/BaseLayout тестов отдельно прошли с запрещёнными fetch/HTTP/HTTPS. `pnpm openspec:validate`: 26 items и 54 архива без ошибок. Логи — `astro-fonts-907-resume/{lint,typecheck,test,openspec-validate,www-build,media-build}-no-preload.log` и `font-tests-no-preload-offline.log`.

Отдельная production-копия — `astro-fonts-907-resume/production-after-no-preload/{www,media}`: 5610/7 файлов, 9/2 WOFF2 и прежние 237768/32516 bytes. Рядом manifest, SHA-256 входных source-файлов и новые bundle YAML. Все 44 JS-файла совпали с предыдущим after. BaseLayout CSS теперь 50914 raw / 8261 Brotli / 9284 gzip bytes. Промежуточная браузерная проверка нулевого font preload, production KB fix и затронутых prose-разделов завершена; task 2.2 закрыта, 3.1 остаётся незавершённой.

Preload, timings и размеры в разделе «Исторические результаты предыдущей сборки с preload» относятся к **предыдущему rejected artifact** `production-after-vpn`, а не к последующим правкам. Промежуточная `production-after-no-preload` ещё использовала optimized fallback media; согласованная `production-final-media-fallback` выключает его только там. Источник остаётся штатным Fontsource API. Обсуждённые переход на локальные пакеты и унификация media **не разрешены и не применены**.

Адресный reviewer-повтор после отмены preload не нашёл новых ошибок в коде или лишней сложности. Устаревшее упоминание генерации preload в Goals change и неоднозначная формулировка проверки в документации разработки исправлены. Следующий повтор подтвердил их устранение, актуальные браузерные результаты и статус задач; замечание о границе исторических результатов тоже исправлено. Итоговые source/документы после решения по media и sync/archive потребуют финального повтора.

### Браузерное подтверждение сборки без preload

- В браузере нет font preload; дополнительно проверены все 370 www HTML и один media HTML. У всех новых WOFF2 инициатор CSS, не preload link. Наборы и байты совпали с baseline в обеих ширинах.
- Normal: 14 URL × две ширины × две версии, 56 captures. У 26 www-пар совпали выбранная loaded-геометрия, prose width/height и переносы; 25 PNG побайтно равны. Www 404 desktop отличается на 28 пикселей при равной выбранной текстовой геометрии. Проверены все разделы с `.ui-prose`, включая reviews/rules, status, sarafan, map, events, regulation и people; нового clipping у видимых контролов нет.
- Desktop KB, три валидные cold/slow пары: CLS **0,0318069583 → 0,0192851499**, новый диапазон 0,0192058513–0,0215782273. Loaded prose width/height остались 664,015625/4660,03125 px. FCP/LCP 564 (548–584) → 400 (392–556) ms; перекрывающиеся диапазоны не доказывают устойчивого ускорения.
- Главная mobile, три валидные пары: CLS **0 → 0**; LCP 1116 (1084–1140) → 1032 (1020–1176) ms; FCP 544 (540–556) → 388 (384–392) ms. CPU не изолирован; устойчивый выигрыш по LCP не заявляется.
- Warm reload: шесть font entries с transferSize 0. ClientRouter главная → новость сохраняет tokens/sentinel, без новых font entries. Видимый `ā` добавляет только Fira Sans 400 latin-ext / 46400 bytes. Проверены обе ширины.
- Desktop KB delay/fail: текст виден, поиск открывается и закрывается Escape, при fail работает переход на главную. Это адресные adverse-проверки, не замена полной матрицы.
- Media loaded H1 по-прежнему шире на 8,4375/11,234375 px, ссылка — на 4 px. Файлы media и loaded PNG идентичны предыдущему rejected after: отмена preload эту проблему не меняет.

Отчёт и evidence: `/private/var/folders/sb/82f4cg9n6z182c5q0k6dn3hr0000gn/T/opencode/astro-fonts-907-no-preload-interim-20261005/`; `report.md`, `selected-captures.json`, `numeric.json`, inventories и manifest 265 файлов. Исходные локальные delivery failures (status 0 у CSS/modules) сохранены и исключены из selected evidence; заменяющие captures валидны. Для одной numeric-пары пересняты обе версии с одинаковым увеличенным TCP backlog; shaping и browser не менялись. Абсолютные timing gains не обобщаются.

Это промежуточная проверка. На окончательном candidate ещё нужны полная delay/fail-матрица шести URL в обеих ширинах, оставшиеся cold/slow пары главной/новости/KB, окончательная CSP-проверка и reviewer. Старые результаты не подменяют проверку изменившихся входов. WebKit недоступен через разрешённый CLI; CPU не изолирован. Свои previews и browser sessions закрыты; dev 4321/4322 агент не останавливал, но при финальной сверке listeners уже не обнаружил.

### Фактическая загрузка шрифтов без preload по страницам

Базовый набор www: **Fira Sans 400/600 и PT Serif 700, каждое начертание в Cyrillic и Latin** — шесть WOFF2 / 121608 bytes. Семейства и роли прежние: PT Serif — заголовки, Fira Sans 400 — основной текст, Fira Sans 600 — интерфейс и выделения. Метрики CSS-роли и HTTP-запросы записаны отдельно; это не физическая per-glyph проверка локальных fallback.

- `/`, `/news/2026/10/october-asphalt/`, `/kb/tsn/manipulations/`, www 404: базовый набор, **6 / 121608 bytes**.
- `/reviews/rules/`, `/status/incidents/2026/03/dam-flood-closure/`, `/map/animals-wehome/`, `/events/2026/05/apple-garden/`, `/people/akornyakov/`: базовый набор, **6 / 121608 bytes**.
- `/815/compare/`: базовый набор + Fira Sans 600 latin-ext для `₽`, **7 / 171876 bytes**.
- `/reviews/2026-08-10-why-i-do-not-recommend-shelkovo/` и `/815/regulation/`: базовый набор + Fira Sans 400/600 latin-ext, **8 / 218276 bytes**.
- `/sarafan/construction/akvazhilservis/`: базовый набор + Fira Sans 400 latin-ext, **7 / 168008 bytes**.
- Media 404: только Cyrillic PT Serif 700 и Fira Sans 600, **2 / 32516 bytes**.

Холодные completed HTTP 200 WOFF2-запросы совпали в mobile/desktop и baseline/after. PT Serif 700 latin-ext в этих просмотрах не загружался. Полные family/weight/subset/asset/SHA-256/body bytes и CSS roles промежуточной сборки — в `astro-fonts-907-no-preload-interim-20261005/{baseline,after}/inventory.{json,md}`; последний candidate с media-исключением подтверждает тот же список в `astro-fonts-907-final-acceptance-20261005/{baseline,final}-inventory.{json,md}`.

## Исторические результаты предыдущей сборки с preload

## Чистая сборка и отказ источника

Одноразовые proof-хосты используют реальные общие определения и `Fonts.astro`, штатный `fontsource()`, собственные пустые font/Vite caches и реальные API/CDN-ответы. Это проверка подключения, а не сборка целого production-приложения. Входные SHA-256 четырёх font-модулей совпали с рабочими исходниками после коммита `fbea620f`.

- Www: все девять WOFF2 — Fira Sans 400/600 и PT Serif 700 normal, subsets Latin/Cyrillic/latin-ext; **237768 bytes**. Каждый файл совпал по SHA-256 с сохранённым npm-baseline. Generated variables и оптимизированные fallback присутствуют; три Cyrillic preload используют `/static/fonts/`.
- Media: ровно два Cyrillic WOFF2 — Fira Sans 600 и PT Serif 700 normal; **32516 bytes**. Оба совпали с npm-baseline; URLs под `/_media/fonts/`, preload отсутствует.
- Все восемь отказов (каталог metadata, отдельная семья Fira Sans, отдельная семья PT Serif, WOFF2-файл — для каждого хоста) отвергнуты с exit 1; `404.html` не выпущен. При отказе одной семьи другая сохранила полную матрицу. Metadata-отказы остановил guard, WOFF2-404 — штатный `CannotFetchFontFile` Astro.
- Proof www содержит 10953 raw bytes встроенного font CSS и 42 font faces (девять веб-шрифтов, 33 локальных fallback); media — 2323 bytes и восемь faces (два веб-шрифта, шесть fallback). Стоимость итогового production HTML/CSS ещё нужно измерить отдельно.

Финальные успешные cold builds выполнены 5 октября, 07:00:24–27 UTC, Node 24.20.0 / Astro 7.3.5 на macOS arm64. Каталог доказательств: `/private/var/folders/sb/82f4cg9n6z182c5q0k6dn3hr0000gn/T/opencode/proof-fonts-907-s7rjjp/`. `README.md` содержит команды, `summary.json` — полную матрицу, `final-state.json` — совпадение входов и отсутствие оставшихся процессов, `sha256.txt` — 777 файлов. Roots: `www-none-KDZHWv` и `media-none-Fk3G5l`; fault roots и журналы перечислены в README.

Ранний эксперимент непреднамеренно задействовал общий Vite `.vite`; общий cache не удаляли. Эти прогоны исключены из итоговой матрицы: все десять сценариев повторены с отдельными root, font cache и Vite cache. npm-файлы служили только точкой сравнения байтов, не источником шрифтов и не подложенным кешем.

## Сетевой сбой

Проблемный запрос — `https://api.fontsource.org/v1/fonts`. Node и curl получали HTTP 200, но тело каталога обрывалось; family metadata и CDN-файлы в том же probe скачивались успешно. Сбой повторялся с двумя IPv4 адресами, разными HTTP/compression режимами. Точная причина не установлена; основания приписать его исключительно Astro, Node, DNS, IPv6 или compression не найдены.

Источник восстановился самостоятельно: каталог полностью прочитан в 06:55 UTC и снова в финальных cold builds около 07:00 UTC. Env, DNS, proxy и системную сеть агент не менял; дополнительных параметров для production не требуется. Успех разовой сборки не гарантирует дальнейшую доступность сервиса.

Повторные production www/media builds после этого снова получили `read ETIMEDOUT` и завершились exit 1. Журналы — `astro-fonts-907-resume/{www,media}-build-recovered-source.log`. Владелец направил `api.fontsource.org` под VPN; первая свежая Node-проба ещё не завершилась за 45 s. Системный DNS-кеш агент сбросить не смог: обе команды с `sudo -n` потребовали пароль.

Позднее работающий dev-сервер владельца успешно отдал все шесть базовых шрифтов главной, а новый прямой Node-запрос полностью прочитал каталог: HTTP 200, 538887 bytes. После этого успешно завершились обе production-сборки и visual-повторы. Кеш dev-сервера не копировали в production; серверы владельца не останавливали.

## Production и визуальные стенды

- `pnpm bundle:analyze` и `pnpm --filter @shelkovo/media build` завершились exit 0. Www публикует девять WOFF2 / 237768 bytes, media — два / 32516 bytes. Сохранённая after-копия: `astro-fonts-907-resume/production-after-vpn/{www,media}`; SHA-256 каждого файла — в соседнем `manifest.json`, журналы — `{www,media}-build-vpn.log` в каталоге возобновления.
- Итоговые `docs/bundle/*.yaml` получены успешным `bundle:analyze`. Все 44 JS-файла восстановленного baseline и after совпали по путям и SHA-256. Общий внешний CSS BaseLayout уменьшился с 53506 до 50908 raw bytes, с 8713 до 8267 Brotli и с 9781 до 9283 gzip. Стоимость встроенного font CSS и HTML учитывается отдельно в браузерном сравнении.
- Все шесть визуальных хостов прошли 38 тестов: Breadcrumbs 5, Icons 1, news-event 8, place-opening-hours 12, status 6, sticky-table 6. Все 31 PNG-эталон неизменны; thresholds не менялись. Свои fixture-процессы закрыты. Успешные новые журналы и `results.json`: `astro-fonts-907-visual-20261005.Xi6Rze/vpn-recovered-20261005.76zEQ8/` в том же временном корне.

Отдельная точка сравнения — YAML, закоммиченные в Git-базе `b445f5fb`. Относительно них набор клиентских модулей сохранён, но `runtime.js` в актуальном отчёте больше: 1511 → 2169 raw bytes, 747 → 1011 Brotli, 889 → 1181 gzip; rendered-размер Yandex Maps runtime — 2375 → 3655 bytes. В восстановленном artifact **до миграции** этот runtime уже имел 2169 bytes и тот же SHA-256, что after: `eb9bb65111b4901907b9a80d4e10dd55944dfec6ca031130bae5d99bc4fd4fd9`. Его исходник в этой ветке не менялся. Причина расхождения старого Git-отчёта с фактическим baseline не установлена; это расхождение отчётов нельзя приписать миграции шрифтов. Актуальные YAML сохранены без подгонки размеров.

## CSP и HTTP-доставка

Chromium 147, 390×844: шесть URL проверены в отдельных холодных сессиях через локальный preview сохранённых production-артефактов. Preview отдавал точные enforced CSP-заголовки из текущих nginx-конфигов, без Report-Only и ослабления политики. Наблюдатели CSP и ошибок установлены до навигации.

- CSP-нарушений, ошибок страницы и повторных запросов одного WOFF2 нет. Все шрифты — same-origin, HTTP 200, `font/woff2`; браузер не обращался к Fontsource.
- Главная, новость, KB и www 404 загрузили шесть WOFF2 / 121608 bytes. Compare — семь / 171876 bytes: дополнительный Fira Sans 600 latin-ext нужен символу `₽`, как и в baseline.
- На всех www-страницах ровно три Cyrillic preload с `crossorigin=anonymous` и `type=font/woff2`. Media 404 загрузила только два Cyrillic WOFF2 / 32516 bytes, без preload и script elements.
- Независимый HTTP GET подтвердил доступность всех девяти www-файлов под `/static/fonts/` и двух media-файлов под `/_media/fonts/`; MIME и magic `wOF2` корректны. Статическая сверка nginx locations подтвердила, что media-шрифты обслуживает локальный `/_media/`, не S3 proxy.

Отчёт, точные заголовки, JSON и HAR: `/private/var/folders/sb/82f4cg9n6z182c5q0k6dn3hr0000gn/T/opencode/astro-fonts-907-csp-20261005/`. Собственные браузерные сессии и previews закрыты; пользовательские dev-серверы не затронуты.

Это проверка браузера с enforced политикой, **не реального nginx runtime**: TLS/HTTP2, deployed MIME map и S3 proxy не проверяли. Allowlist браузера ограничен локальными origin; работу внешних интеграций этот прогон не подтверждает. Для размеров тел использованы Content-Length и Resource Timing, не поле HAR `response.content.size`, которое этот CLI заполняет с transport overhead.

## Шрифтовые файлы и загрузка по страницам

Результаты ниже — холодная загрузка проверенных URL после миграции. Семейство Fira Sans обслуживает основной текст и интерфейс, PT Serif — заголовки. Локальные метрические fallback не требуют скачивания WOFF2.

Базовый набор www — шесть файлов под `/static/fonts/`:

- Fira Sans 400: Cyrillic `b7cf8eb07fbc5551.woff2` — 10788 bytes; Latin `16c6b6bcefe823c9.woff2` — 23872 bytes.
- Fira Sans 600: Cyrillic `68d70c0c69b83b0a.woff2` — 11600 bytes; Latin `529008f4f946aa15.woff2` — 24844 bytes.
- PT Serif 700: Cyrillic `f94cfc113a4b5ecd.woff2` — 20916 bytes; Latin `3307c7cbc265f5be.woff2` — 29588 bytes.

По страницам:

- Главная `/`: базовые шесть — 121608 bytes. Заголовок, бренд и названия карточек — PT Serif 700; основной текст — Fira Sans 400; интерфейс и выделения — Fira Sans 600.
- Новость `/news/2026/10/october-asphalt/`: базовые шесть — 121608 bytes. H1 — PT Serif 700; текст — Fira Sans 400; интерфейс, выделения и metadata — Fira Sans 600.
- База знаний `/kb/tsn/manipulations/`: базовые шесть — 121608 bytes. H1/H2 — PT Serif 700; текст — Fira Sans 400; интерфейс и выделения — Fira Sans 600.
- Сравнение тарифов `/815/compare/`: базовые шесть и Fira Sans 600 latin-ext `6bb523823919152c.woff2` — ещё 50268 bytes для символа `₽`; всего семь файлов / 171876 bytes. Заголовки — PT Serif 700; описание — Fira Sans 400; интерфейс и тарифные цифры — Fira Sans 600.
- Www 404, запрос `/__missing-font-baseline-907`: базовые шесть — 121608 bytes. H1 — PT Serif 700; пояснение — Fira Sans 400; интерфейс и ссылка — Fira Sans 600.
- Media 404, такой же missing URL на отдельном origin: только Cyrillic Fira Sans 600 для ссылки и PT Serif 700 для заголовка — два файла / 32516 bytes под `/_media/fonts/`.

Www предзагружает только три Cyrillic-файла из базового набора. Latin и latin-ext не предзагружаются. Media не использует preload. Ещё два опубликованных www-файла — Fira Sans 400 latin-ext `333d6feeeb6c77e0.woff2` (46400 bytes) и PT Serif 700 latin-ext `62db4f720fa3ee9c.woff2` (19492 bytes) — в этих первичных просмотрах не загружались. Хешированные имена описывают эту сборку, не постоянный контракт.

Назначенные CSS-роли и завершённые HTTP 200 WOFF2-запросы записаны раздельно в `browser-acceptance/{baseline,after}-paired/inventory.{json,md}`. Это не per-glyph проверка физического системного шрифта. В самостоятельном холодном просмотре главной вставка видимого `ā` U+0101 с body-role и весом 400 загрузила только Fira Sans 400 latin-ext / 46400 bytes, без preload; PT Serif latin-ext и Fira Sans 600 latin-ext не добавились.

## Браузерное сравнение и регрессии

Проверены обе сохранённые production-версии: шесть URL в viewport 390×844 и 1440×1000, normal, задержка каждого WOFF2 на 8 s и отказ 503. Свежие cold/slow-замеры — три прогона на каждую пару главная/новость/KB × viewport × версия, всего 36 навигаций. Все 180 captures и 136 PNG сохранены; собственные браузеры и previews закрыты, пользовательские dev-серверы оставлены работающими.

Условия: macOS 27.0.1, M3 Pro, Chromium 147.0.7727.56, DPR 1, светлая тема, CPU 1× без throttling. Slow — задержка 150 ms перед каждым ответом и передача блоками 16 KiB с паузой 100 ms; это около 160 KiB/s **на отдельный ответ**, не общий bandwidth/Slow 4G. Для cold создавалась новая ephemeral-сессия. Измерения выполнены после завершения build/visual/CSP, но OS/CPU системно не изолированы. Внешние origin заблокированы allowlist. WebKit недоступен через разрешённый CLI и не проверен.

### Desktop KB

Cold/slow CLS вырос **0,0318069583 → 0,0490755997**, одинаково во всех трёх парах: +0,0172686414 / +54,3%. Сдвиги совпадают по времени с завершением Latin fonts; prose меняет ширину 595 → 664,015625 px, абзацы и H2 сдвигаются на 29,75–59,5 px. LayoutShift API не сообщает причину, поэтому весь CLS не объявляется font-attributed; стабильная регрессия страницы требует исправления. Mobile KB: 0 → 0,0001815722 во всех трёх парах.

### Media 404

При одинаковых WOFF2 loaded H1 стал шире на **8,4375 px mobile / 11,234375 px desktop**, ссылка — на 4 px. Diagnostic разделил слова и пробелы: метрики кириллических слов совпали, но пробелы вне Cyrillic unicode-range обслуживает новый optimized local fallback. Для H1 36 px space optimized Times New Roman Bold имеет 13,354996 px вместо прежних Georgia 9,140625 px; у ссылки optimized Helvetica Neue — 5,938080 вместо system-ui 3,9375 px.

В mobile delay fallback H1 вместо одной строки занимает две; после загрузки вновь одну. Delay CLS: **0,000521 → 0,022958** mobile, 0,000139 → 0,000987 desktop. Это один контролируемый delay-прогон на viewport. Текст читается и ссылка получает click, но итоговая типографика и устойчивость fallback не сохранены. Идёт поиск минимального исправления; отключение согласованного optimized fallback нельзя принять молча.

#### Кандидат для согласования

Штатного решения, которое сохраняет и optimized Cyrillic fallback, и прежние generic-пробелы, в Astro 7.3.5 не найдено. Family `unicodeRange` не заменяет явный диапазон провайдера; generated fallback не получает этот диапазон. Минимальное предложение — `optimizedFallbacks: false` **только у обоих media-семейств**, сохранив www с `true`, два Cyrillic WOFF2, `swap`, прежние `system-ui` и `Georgia, serif`, без preload и клиентских скриптов. Это изменение согласованного подхода, пока **не разрешённое и не применённое** к исходникам.

Диагностический вариант в отдельной копии HTML получен установленным native renderer с `false`, не новой production-сборкой. В обеих ширинах normal и delay PNG совпали с baseline; loaded H1 снова 281,375/375,171875 px, ссылка 137,375 px. В свежих одиночных delay-парах CLS равен baseline: 0,0005208618 mobile / 0,0001530603 desktop; fallback H1 остаётся однострочным. Бюджет прежний — 2 / 32516 bytes; CSP-нарушений нет. При 503 текст читается и ссылка получает click, но точная fail-геометрия не равна baseline. Внешний destination не загружался.

Отчёт и native CSS proof — `astro-fonts-907-media-candidate-20261005/decision-report.md` в том же временном корне. Свои браузеры и previews закрыты. Если владелец согласует исключение, нужно обновить proposal/design/spec/tasks, затем реализовать настройку и подтвердить настоящим отдельным production artifact; этот диагностический вариант не закрывает 2.3/3.1.

### Остальные результаты

- Loaded PNG главной, новости, KB и Compare побайтно совпали в обеих ширинах; www 404 — на mobile. Desktop www 404 имеет равную текстовую геометрию и визуально совпадает, но побайтное равенство PNG не подтверждено.
- При отказе WOFF2 текст читается, наложения на элементы управления не обнаружены. Поиск главной открывается и закрывается Escape; ссылки пяти www-сценариев ведут на локальную главную. Media ссылка получает click и сохраняет `https://kpshelkovo.online/`; внешний переход отменён listener, destination не загружался. Записаны все 24 взаимодействия.
- Warm reload в обеих ширинах/версиях: шесть font entries с transferSize 0. Переход реальным click главная → новость сохраняет sentinel, события ClientRouter и semantic/generated font variables; новых font entries нет.
- В delay-сценариях сдвиги часто уменьшились: news mobile 0,155432 → 0,058474; KB mobile 0,182036 → 0,064232 и desktop 0,161897 → 0,104465; Compare mobile 0,007798 → 0,000124. Это отдельные наблюдения, не универсальное улучшение.
- Local fallback с descriptor 600 визуально легче прежнего в тарифных цифрах и выделениях; computed weight не доказывает физическое начертание локальных glyphs. Loaded Fira Sans 600 сохранён.

### Свежие cold/slow-замеры

Медиана (min–max), ms; before → after. CLS без единиц, подробные firstTextDomMs и lastFontResponse — в raw-сводке. firstTextDomMs измеряет DOM-геометрию, не первый painted glyph.

- Главная mobile: LCP 1088 (1080–1096) → 1100 (1100–1116); FCP 540 (476–544) → 540 (480–548); CLS 0 (0–0,014522) → 0 (0–0).
- Новость mobile: LCP/FCP 712 (712–716) → 704 (700–708); CLS 0,058771 (0,058771–0,059203) → 0,057927 (0,057927–0,058183).
- KB mobile: LCP/FCP 544 (536–548) → 536 (532–544); CLS 0 → 0,000182, без разброса.
- Главная desktop: LCP 1416 (1400–1432) → 1408 (1396–1416); FCP 540 (536–548) → 480 (476–532); CLS 0,000039 → 0,000034, без разброса.
- Новость desktop: LCP/FCP 724 (716–732) → 708 (704–724); CLS 0,060380 (0,060380–0,063349) → 0,058164 (0,058164–0,064122).
- KB desktop: LCP/FCP 560 (560–564) → 552 (532–556); CLS 0,031807 → 0,049076, без разброса.

Mobile LCP главной вырос на 12 ms по медиане; LCP там — неизменённое hero-изображение. Причина не установлена, N=3 и отсутствие CPU isolation ограничивают вывод. При повторной приёмке исправленного artifact нужно проверить и этот сигнал. Универсального выигрыша по LCP/FCP и fallback текущая матрица не доказала.

### Стоимость HTML и CSS

Bytes тел, без headers. HTML raw / gzip level 9 / Brotli quality 11, CSS — сумма уникальных реально запрошенных mobile normal-файлов raw / фактический Brotli body, before → after:

- Главная: HTML 18688/4567/3739 → 29579/5442/4518; CSS 58017/9801 → 55419/9355.
- Новость: HTML 21559/5032/4186 → 32459/5908/4973; CSS 73857/13579 → 71259/13133.
- KB: HTML 35036/8922/7406 → 45936/9863/8177; CSS 59516/10386 → 56918/9940.
- Compare: HTML 97537/10226/7770 → 108437/11100/8567; CSS 81977/14139 → 79379/13693.
- Www 404: HTML 12933/3369/2708 → 23833/4255/3473; CSS 57057/9856 → 54454/9394.
- Media 404: HTML 3122/1419/1125 → 5129/1801/1472, внешнего CSS нет. Sidecars отсутствуют: **фактическая передача raw 3122 → 5129**, gzip/Brotli — только вычисленный потенциал.

Www inline font-style blocks: 0 → **10953 raw bytes**, 42 faces (девять сетевых, 33 локальных fallback). Прежние девять external faces / 2604 bytes уже входят в CSS before. Media font-face rules: 436 → 1885 bytes (2 → 8 faces), новые font-style blocks — **2323 bytes**; весь inline CSS 2104 → 4081 bytes. Суммарный Brotli HTML + внешний CSS вырос на 303–351 bytes на проверенных www-страницах, WOFF2 не выросли.

Полный отчёт и raw evidence: `astro-fonts-907-resume/browser-acceptance/comparison-report.md`, `numeric-comparison.{json,md}`, обе `*-paired/`, доказательства `kb-desktop-slow-regression-evidence.json`, `media-space-regression-evidence.json`, `home-mobile-lcp-evidence.json`. `sha256.json` проверяет 429 файлов без расхождений. Исходные rejected artifacts и результаты не перезаписываются; исправленный вариант требует отдельной сохранённой сборки и повторной приёмки.

## Проверки исходников и спецификаций

- `pnpm lint` и `pnpm typecheck` прошли после исправления изоляции markup-тестов. `pnpm test`: семь успешных workspace tasks, www — 229 файлов / 1821 тест; остальные пакеты использовали актуальные Turbo cache hits.
- 28 адресных Font Budget / font-data / BaseLayout тестов прошли с запрещёнными `fetch`, HTTP и HTTPS, без попыток доступа к сети.
- `pnpm openspec:validate` после успешных production builds: 26 items и 54 архива, без ошибок. После итоговой редакции и sync/archive нужна повторная структурная валидация.

Журналы — `astro-fonts-907-resume/{lint,typecheck,test}-offline-fixed.log`, `font-tests-offline-hook.log` и `openspec-validate-after-build.log`. Код после этих проверок не менялся; позднее добавлялись результаты приёмки и bundle-отчёты.

Reviewer повторно прочитал весь diff от `b445f5fb` до `fbea620f`, staged/unstaged и новый отчёт; кодовых ошибок не подтвердил. Единственное замечание — недостаточно явно разделены сравнения JS с восстановленным artifact и Git-отчётами; выше добавлены обе точки сравнения и SHA-256. Отдельный `ponytail-review` не нашёл лишней сложности. Браузерные результаты и sync/archive ещё не входили в этот проход; после них нужен адресный повтор.

## Оставшаяся приёмка

Media и desktop KB прошли; полная матрица, CSP и стоимость загрузки зафиксированы. Компромисс mobile KB принят владельцем без дальнейшего исследования или смены кода. Reviewer после этого решения подтвердил согласованность документов, требований и результатов; адресный повтор sync/archive тоже не нашёл проблем. `pnpm openspec:validate` после архивирования прошёл — 26 specs и 55 архивов; лог `astro-fonts-907-resume/openspec-validate-archived-final.log`. Все задачи завершены, основной spec синхронизирован, change архивирован. Человеческие ревью и merge выполняет владелец; браузерные прогоны не повторяются без изменения входов.
