# Astro Fonts: исходная точка приёмки

Baseline для [#907](https://github.com/silentroach/kpshelkovo/issues/907) и [adopt-astro-fonts](/openspec/changes/adopt-astro-fonts/design.md#4-приёмка-по-поведению-и-стоимости-загрузки). Здесь только результаты **до** миграции; сравнение с Fonts API ещё не выполнено.

## Восстановление 5 октября

Прежний временный каталог, перечисленный ниже, утрачен вместе со скриптами, сырыми замерами и PNG. Числа от 3 октября сохранены в этом отчёте, но исходные измерения сейчас нельзя перепроверить.

Сохранившиеся `dist/www` и `dist/media` скопированы до повторной сборки в `/private/var/folders/sb/82f4cg9n6z182c5q0k6dn3hr0000gn/T/opencode/astro-fonts-907-resume/recovered-baseline/`. В копиях 5611 и 7 файлов; новый `manifest.json` фиксирует SHA-256 каждого. После неуспешных новых сборок все файлы корневого `dist` совпали с этими копиями. Прежний manifest утрачен: совпадение с ним не подтверждено.

Скрипты восстановлены в `astro-fonts-907-resume/browser-acceptance/`: `preview.py`, `observe.js`, `measure.py`, `summarize.py`, `costs.mjs`; инструкция — `report.md` в том же каталоге. Свежие normal-прогоны шести URL в обоих viewport сохранили 12 PNG/JSON и подтвердили старые ручные font faces, геометрию, переносы и стоимость HTML/CSS/WOFF2 из этого отчёта. Нагрузка CPU не была изолирована: timing этих прогонов не использовать для числового сравнения.

Успешной сборки с Fonts API пока нет. Cold/slow, fallback, warm/router и latin-ext ещё нужно переснять на одинаковых baseline/after условиях; соответствующие ветви восстановленных скриптов пока не проверены запуском. Старые инструкции ниже описывают протокол и исторические пути, а не доступный сейчас набор файлов.

## Сохранённые artifacts

- Каталог эксперимента: `/private/var/folders/sb/82f4cg9n6z182c5q0k6dn3hr0000gn/T/opencode/astro-fonts-907/`.
- Неизменяемая исходная копия: `baseline/www/`, `baseline/media/`, `baseline/bundle/client.yaml`, `baseline/bundle/assets.yaml`.
- Команды завершились успешно: `pnpm bundle:analyze` и `pnpm --filter @shelkovo/media build`. Журналы — `baseline/www-build.log` и `baseline/media-build.log`.
- Снимок сохранён 3 октября 2026 года, `17:18:59 UTC`, до изменения production-подключений. Git HEAD: `b445f5fbf6cd41a49e766f19c39c3ba273872eb0`. Planning artifacts change на момент сборки были незакоммичены.
- В www — 5611 файлов, в media — 7. `baseline/sha256.txt` покрывает artifacts, отчёты, журналы и metadata; повторная проверка всех 5623 записей не обнаружила изменений.
- Измерения и PNG лежат в `measurements/`, вне Git. Сводные данные — `summary.json`, размеры — `costs.json`, вызовы браузера — `cli.jsonl`, HTTP-запросы — `www-requests.jsonl` и `media-requests.jsonl` в каталоге эксперимента.
- Браузер читал только сохранённые копии, не `dist` рабочей ветки. В рамках baseline production-исходники, тесты и `tasks.md` не редактировались; commit/push не выполнялись.

## URL и условия повторения

На `http://127.0.0.1:49107`:

- `home`: `/`.
- `news`: `/news/2026/10/october-asphalt/` — «Продолжение асфальтирования 2-8 октября».
- `kb`: `/kb/tsn/manipulations/` — «ТСН без страшилок».
- `compare`: `/815/compare/`.
- `www404`: `/__missing-font-baseline-907`, локальный сервер возвращает сохранённый `404.html` со статусом 404.

На `http://127.0.0.1:49108`:

- `media404`: `/__missing-font-baseline-907`, также ответ 404.

Окружение:

- macOS 27.0.1, build 26A434; Apple M3 Pro, 36 GiB RAM.
- agent-browser 0.38.2; Google Chrome for Testing / Headless Chrome `147.0.7727.56`, macOS arm64.
- Mobile: `390×844`, DPR 1. Desktop: `1440×1000`, DPR 1. Это изменение viewport, не эмуляция отдельного мобильного устройства.
- Светлая тема; стандартные motion-настройки. Chromium скрывает native scrollbars в screenshots по умолчанию.
- CPU: **1×, без throttling**. Agent-browser этой версии не предоставляет команды ограничения CPU. Нагрузка компьютера не изолирована; условия CPU нужно сохранить при повторе.
- Холодный кеш: новый временный браузер без `--profile`, `--restore` и сохранённого state для каждого прогона. После `close` выдерживается 1 секунда до следующего запуска: без неё один первый пробный запуск столкнулся с гонкой завершения daemon. Пробный результат не входит в числовую сводку.
- Браузер использует `--allowed-domains 127.0.0.1`. Внешние ресурсы заблокированы; локальные HTML/CSS/JS/изображения доступны. Это одинаковое ограничение нужно оставить для after-снимка.

Одноразовый `preview.py` поддерживает четыре режима на каждом origin через `/__control?mode=...`:

- `normal`: немедленная раздача artifacts.
- `slow`: 150 ms задержки перед каждым ответом; тело отправляется блоками 16 KiB, между блоками 100 ms. Это воспроизводимая **серверная задержка и около 160 KiB/s на отдельный ответ**, а не общий лимит канала или эмуляция Slow 4G. Параллельные ответы не делят общий bandwidth.
- `delay`: задержка каждого WOFF2 на 8 секунд; HTML/CSS/JS не замедляются.
- `fail`: каждый WOFF2 получает 503 с пустым телом и `no-store`.

Сервер выбирает существующий Brotli/gzip sidecar по `Accept-Encoding`. CSS, JS и WOFF2 получают `public, max-age=31536000, immutable`; HTML — `no-cache`. Production nginx/CSP этот preview **не воспроизводит**.

Для повторения использовать сохранённые `preview.py`, `observe.js`, `measure.py`, `costs.mjs`, `summarize.py` из каталога эксперимента. Все браузерные действия `measure.py` выполняет через CLI agent-browser. Для after-сравнения нужна отдельная копия скриптов/каталог результатов: текущие `baseline/` и `measurements/` не перезаписывать.

Порядок:

1. Запустить два `preview.py --root <artifact-root> --port 49107|49108 --log <отдельный-log>`.
2. Запустить `python3 measure.py normal`, затем `python3 measure.py adverse cold latinext`; для новой сборки скорректировать проверку URL latin-ext в скрипте под generated asset names, не менять сам символ/вес.
3. `normal` снимает все шесть URL в обоих viewport; `adverse` — задержку и отказ в обоих viewport, до и после завершения запросов; `cold` — по три slow-прогона главной, новости и KB в каждом viewport.
4. `observe.js` подключается как init script до navigation: PerformanceObserver для paint, LCP и layout-shift, события FontFaceSet и ClientRouter, Resource Timing, геометрия H1 каждые 100 ms. Для cold снимается результат после `load`, завершения FontFaceSet и не ранее 3000 ms от navigation.
5. Задержанный fallback фиксируется после появления H1, не ранее 1000 ms; фактические early captures — около 1,15–1,20 s. JSON сохраняет точное время. `settled` снят после завершения шрифтов.
6. `summarize.py` считает CLS как максимум session window: разрыв менее 1 s, длина окна менее 5 s, без `hadRecentInput`; JSON также сохраняет каждый отдельный сдвиг.
7. После работы закрыть собственную browser session и оба preview-процесса.

## Стоимость HTML, CSS и шрифтов

Числа ниже — bytes тела, без HTTP-заголовков. Для HTML указаны raw / gzip level 9 / Brotli quality 11. Внешний CSS — сумма уникальных CSS-файлов, реально запрошенных в normal mobile-сценарии, raw / фактический Brotli body. Подробные URL и размеры каждого CSS есть в `costs.json`.

- Главная: HTML **18 688 / 4567 / 3739**; CSS **58 017 / 9801**.
- Новость: HTML **21 559 / 5032 / 4186**; CSS **73 857 / 13 579**.
- KB: HTML **35 036 / 8922 / 7406**; CSS **59 516 / 10 386**.
- Compare: HTML **97 537 / 10 226 / 7770**; CSS **81 977 / 14 139**.
- www 404: HTML **12 933 / 3369 / 2708**; CSS **57 057 / 9856**.
- media 404: HTML **3122 / 1419 / 1125**; внешнего CSS нет. В media artifact нет compressed sidecars, поэтому preview передавал raw HTML; gzip/Brotli здесь — вычисленный потенциал сжатия, не наблюдаемая передача.

Встроенные font faces:

- Все пять www-страниц: **0 bytes** inline font CSS. Девять `@font-face` во внешнем общем CSS занимают **2604 raw bytes**; они уже входят в суммы CSS выше.
- Media 404: два inline `@font-face` занимают **436 raw bytes**. Весь содержащий их style block — **2104 bytes**, включая foundation/UI, поэтому это не размер только font CSS.
- После миграции отдельно сравнивать font-style block и итоговый сжатый HTML: одних YAML-отчётов внешних assets недостаточно.

WOFF2:

- Fira Sans 400 Cyrillic — **10 788 bytes**; Latin — **23 872**; latin-ext — **46 400**.
- Fira Sans 600 Cyrillic — **11 600**; Latin — **24 844**; latin-ext — **50 268**.
- PT Serif 700 Cyrillic — **20 916**; Latin — **29 588**; latin-ext — **19 492**.
- Шесть базовых файлов — **121 608 bytes**; три дополнительных — **116 160**; весь www font artifact — **237 768**. SHA-256 каждого файла записан в `costs.json` и manifest.

В normal-сценариях обоих viewport:

- Главная, новость, KB, www 404: шесть запросов / **121 608 bytes**, без latin-ext.
- **Compare: семь запросов / 171 876 bytes.** Дополнительный Fira Sans 600 latin-ext нужен видимому `₽` (`U+20BD`) в тарифах. `compare-ruble.json` фиксирует текст вроде `470 ₽/сотка`, семейство Fira Sans и вес 600. Семь файлов на этой странице — baseline, а не автоматический признак регрессии.
- Media 404: только два Cyrillic-файла, Fira Sans 600 и PT Serif 700 / **32 516 bytes**, на media-origin под `/_media/`.
- В www три Cyrillic preload: Fira Sans 400/600 и PT Serif 700; в media preload отсутствует. Latin/latin-ext preload нет. Один и тот же WOFF2 не появляется дважды в списке resource entries одной navigation.
- Все наблюдаемые шрифтовые URL принадлежат origin страницы: `/static/` для www, `/_media/` для media. Проверка доставки через production nginx и CSP остаётся отдельной частью интеграционной приёмки.

## Три холодных slow-прогона

Для каждого показателя: **медиана (минимум–максимум)**, время в ms от navigation. В каждом из 18 прогонов было шесть WOFF2 / 121 608 bytes. Это lab-baseline в описанном server-shaped режиме, не field Web Vitals.

Mobile `390×844`:

- Главная: LCP **996 (992–1024)**; FCP **540 (484–544)**; последний font response **774,7 (753,4–779,9)**; CLS **0 (0–0,014522)**.
- Новость: LCP **724 (712–728)**; FCP **724 (712–728)**; последний font response **775,6 (774,2–934,1)**; CLS **0,059203 (0,059203–0,059203)**.
- KB: LCP **556 (544–576)**; FCP **556 (544–576)**; последний font response **798,2 (766,6–807,0)**; CLS **0 (0–0)**.

Desktop `1440×1000`:

- Главная: LCP **1228 (1216–1232)**; FCP **548 (484–556)**; последний font response **766,8 (759,1–781,6)**; CLS **0,000039 (0,000039–0,000327)**.
- Новость: LCP **728 (720–736)**; FCP **728 (720–736)**; последний font response **773,9 (767,5–778,0)**; CLS **0,060380 (0,060380–0,066345)**.
- KB: LCP **568 (544–572)**; FCP **568 (544–572)**; последний font response **794,4 (753,7–796,5)**; CLS **0,031807 (0,031807–0,033548)**.

Появление текста:

- `firstTextDomMs` измеряет первое наличие геометрии видимого H1, **не первый отрисованный glyph**. Медианы mobile: главная 291,0 ms, новость 283,0 ms, KB 284,0 ms; desktop: 287,5 / 278,6 / 282,0 ms. Все диапазоны есть в `summary.json`.
- FCP относится ко всей странице. У главной LCP — локальное hero-изображение; у текстовых страниц JSON сохраняет конкретный LCP element. Нельзя приписывать весь LCP изменению шрифтов.
- Отдельные сдвиги совпадают по времени с заменой шрифтов: например, в mobile-новости первый slow-прогон сдвинул абзацы и пункты списка на 28 px около 773 ms, перед `loadingdone` около 776 ms. В desktop KB изменились ширина и переносы prose около 804 ms, перед `loadingdone` около 805 ms.
- Это наблюдаемая корреляция со сменой метрик. LayoutShift API не сообщает причину; общий CLS страницы нельзя объявлять целиком font-attributed. Raw JSON сохраняет источники, previous/current rects и font events для сравнения.

## Задержка, отказ и итоговая типографика

Сохранены normal loaded screenshots и отдельные early/settled screenshots delay/fail для каждого URL в обоих viewport. Файлы называются `<page>-<viewport>-loaded.png`, `<page>-<viewport>-delay-early.png`, `...-delay-settled.png`, `...-fail-early.png`, `...-fail-settled.png`.

На early delay-снимках FontFaceSet ещё `loading`, текст уже виден. В просмотренных примерах новости, KB, Compare и обеих 404 заголовки, абзацы, цифры и ссылки читаются системным fallback; наложения текста на кнопки не обнаружены. В mobile header «Шелково Онлайн» при fallback переносится на две строки, с загруженным шрифтом — на одну. Переносы основного текста тоже меняются.

Геометрия loaded H1, mobile / desktop:

- Главная: **318×94,75, 2 строки / 1132×68,83, 1 строка**.
- Новость: **318×116,63, 3 строки / 896×103,66, 2 строки**.
- KB: **318×77,75, 2 строки / 896×51,83, 1 строка**.
- Compare: **318×77,75, 2 строки / 664×51,83, 1 строка**.
- www 404: **350×77,75, 2 строки / 506,03×51,83, 1 строка**.
- media 404: **281,38×38,88, 1 строка / 375,17×51,83, 1 строка**.

Во всех случаях H1 использует PT Serif 700, размер 36 px mobile / 48 px desktop. Число строк не заменяет визуальную сверку конкретных переносов. `summary.json` хранит также координаты и раннюю fallback-геометрию; computed `font-family` сам по себе не доказывает, какой fallback реально нарисовал glyph.

При delay-прогоне сдвиги заметнее, чем при быстрой загрузке: например, mobile-новость имеет суммарное окно CLS около **0,18725**, mobile KB — около **0,18204**. Часть событий совпадает с завершением загрузки, DOMContentLoaded и применением отложенных стилей; причинность только шрифтам не приписывается. На Compare дополнительный latin-ext начинает загружаться после базовых файлов, поэтому окончательный FontFaceSet завершается примерно на 16-й секунде при 8-секундной задержке каждого ответа.

При 503 текст остаётся видимым. Отдельно проверено:

- На главной кнопка поиска открывает dialog; Escape закрывает его. Screenshot: `home-mobile-fail-search-dialog.png`.
- На пяти www-сценариях ссылка на главную работает с отказавшими шрифтами; результаты navigation — `failure-interactions.json`.
- На media 404 ссылка получает click и сохраняет `https://kpshelkovo.online/`. Временный listener отменил сам переход, чтобы не уходить с локального baseline: доступность click проверена, загрузка destination не проверялась.

## Тёплый кеш, ClientRouter и latin-ext

- После cold normal-загрузки главной выполнен reload в том же браузере: все шесть font resource entries имеют `transferSize: 0`, повторной передачи WOFF2 не было. Результат — `home-mobile-warm-reload.json`.
- Затем реальным click выполнен переход на выбранную новость. Сохранился sentinel в `window`, зарегистрированы `astro:after-swap` и `astro:page-load`: это ClientRouter, не полная navigation. После click новых font resource entries нет; `--font-body` и `--font-heading` сохранены. Результаты — `clientrouter.json` и `news-mobile-clientrouter.json`.
- В отдельной холодной normal-главной latin-ext не запрашивался. После вставки видимого `ā` (`U+0101`) с `font-family: var(--font-body)` и `font-weight: 400` добавился **только** Fira Sans 400 latin-ext / **46 400 bytes**; другие расширенные начертания не загрузились. Результаты — `latinext-before.json`, `latinext-after.json`, `latinext-after.png`.

## Ограничения и оставшаяся приёмка

- WebKit не проверен: установленный agent-browser поддерживает engines `chrome` и `lightpanda`, не WebKit. iOS-вариант потребовал бы Xcode/Appium; `xcrun simctl list devices available` завершился ошибкой отсутствия `simctl`. Другой браузерный инструмент вместо agent-browser не использовался.
- CPU не ограничен; сеть замедлена сервером, не браузерным общим bandwidth. Если для release потребуется другой профиль сети/CPU, его нужно применить и к сохранённому baseline, и к after-сборке, не сравнивать с числами этого отчёта напрямую.
- Это проверка первых viewport и конкретных перечисленных взаимодействий, не аудит каждой ссылки/кнопки и не проверка всей страницы на каждом размере.
- Не измерен точный момент первого painted glyph. Есть FCP, ранняя DOM-геометрия и screenshots читаемого текста до завершения шрифтов.
- Production CSP/nginx, чистая Fonts API build, визуальные fixture-тесты и сравнение after-сборки — ответственность следующей интеграционной приёмки. Baseline этих новых подключений не подтверждает.
- `tasks.md` намеренно не менялся. Закрывать #907 или считать 3.1 выполненной по этому отчёту нельзя.
