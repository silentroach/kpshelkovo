# Задача 12: Проверить качество и выпустить поиск

## Цель

Проверить полный корпус, русский поиск, сетевой бюджет и интерфейс перед production release без создания хрупкой большой test suite.

## Объем работы

- Собрать полный production artifact после задач 01-10.
- Проверить небольшой фиксированный query matrix по главным разделам.
- Проверить русскую морфологию на парах `тариф`/`тарифы` и `вода`/`воды`.
- Проверить, что 404, verification, `noindex`, archives, tags и повторяющие lists отсутствуют.
- Измерить Pagefind network payload холодного типичного запроса.
- Измерить warmed search latency на согласованном среднем mobile profile.
- Проверить отсутствие запросов `/search/` до открытия поиска.
- Выполнить keyboard, screen-reader smoke, 200% zoom и responsive проверку.
- После успешного release добавить короткую implementation note в ADR-025.

Пример query matrix должен содержать реальные устойчивые намерения, а не точные строки случайных заголовков. Достаточно 8-12 запросов на весь сайт.

## Критерии приемки

- Ожидаемые canonical URLs входят в первые релевантные результаты, а исключенные страницы не находятся.
- Холодный типичный запрос укладывается в 300 КБ Pagefind-ресурсов, warmed p95 - в 100 мс.
- Search dialog проходит production browser smoke без console errors и доступен на целевых viewport/zoom режимах.

## Проверка

- Запустить `pnpm typecheck`, focused tests поиска и `pnpm build`.
- Проверить production-like preview через browser Network, Console и accessibility tree.
- Не фиксировать полный index snapshot, точный порядок всей выдачи или Lighthouse как отдельный обязательный тест.

## Результат RC-проверки 14 августа 2026 года

Статус: **локальные критерии RC пройдены; выпуск еще не завершен**.

Задача остается незавершенной только из-за отложенных проверок dev-режима, public deploy, non-Chromium и реального screen reader.

### Локальные критерии и повторная проверка

- [x] Переход по `Enter` исправлен. В свежем production preview сценарий `тарифы` -> `ArrowDown` -> `Enter` и отдельный `Enter` из поля переводят на первый canonical URL. На целевой странице остается один закрытый dialog с очищенным полем, повторного открытия нет.
- [x] Холодный сетевой бюджет пройден после ограничения первой выдачи восемью результатами. Свежая cache-disabled сессия с запросом `тарифы` получила 14 Pagefind-ресурсов на **145 102 байта (141,70 КиБ)** без учета HTTP-заголовков: runtime, worker, entry, metadata, WASM, один index chunk и восемь fragments. При прокрутке выдача автоматически увеличивается с 8 до 16 уникальных результатов без зависшего loading state.
- [x] Warmed end-to-end p95 не более 100 мс. На профиле 390 x 844 CSS px, DPR 2 и CPU slowdown 4x один явный uncached client call для тяжелого intent `категорически не рекомендую покупать участок` занял **304,2 мс** при raw `search()` 2,2 мс и заполнил query-scoped cache. Следующие 150 same-query initial-8 samples дали **1,6 мс p95** и для raw `search()`, и для полного клиента; максимум полного клиента - 3,3 мс. Контрольный прогон `тарифы` с восемью видимыми результатами дал **1,0 мс p95** для обоих измерений и максимум 8,9 мс после отдельного uncached client call на 2,2 мс.

### Команды и артефакт

- [x] `pnpm typecheck` прошел для workspace.
- [x] `pnpm test` прошел для workspace; в `@shelkovo/www` прошли 126 test files и 675 tests.
- [x] Focused run клиента и диалога прошел: 2 files, 17 tests.
- [x] `pnpm build` создал production artifact из 221 страницы; Pagefind 1.5.2 проиндексировал 156 документов и 7 290 слов в одном русском индексе с одним filter и одним sort key.

### Query matrix

Проверены 12 устойчивых intent, без требования точного полного порядка:

- [x] Новости и морфология `тариф` / `тарифы`: оба запроса ставят `/news/2026/06/tariff-appeal-registration-check/` первым и дают одинаковый ведущий набор.
- [x] Инцидент статуса `повреждение линии 10 кВ`: в первых результатах есть `/status/incidents/2026/04/electricity-river-10kv-line-damage/`.
- [x] Service page и морфология `вода` / `воды`: оба запроса дают одинаковый ведущий набор, включая `/status/water/` в первых восьми и профильные инциденты выше.
- [x] База знаний `Meshtastic`: первый результат `/kb/communication/meshtastic/`.
- [x] Встреча и deep anchor `Карабас-Барабас`: результат `/meetings/2026-02-21-ok/#t-00-01-55`.
- [x] Люди `Геннадий Мозгов`: первый результат `/people/gmozgov/`.
- [x] Отзывы `категорически не рекомендую покупать участок`: первый результат `/reviews/2026-08-10-why-i-do-not-recommend-shelkovo/`.
- [x] Сарафан `Золото Сибири`: результат `/sarafan/garden/zoloto-sibiri-kora/#contact-methods`.
- [x] Compare `Арнеево Парк`: результат `/815/compare/settlements/arneevo-park/`.
- [x] Основная страница регламента `разделы сметы`: первый результат `/815/regulation/`.
- [x] Услуги регламента `вывоз ТКО`: единственный результат `/815/regulation/services/`.
- [x] Общее имущество регламента `ливневые траншеи`: первый результат `/815/regulation/assets/`.

### Exclusions

Аудит `search(null)` загрузил данные всех 156 документов и подтвердил состав: 45 новостей, 31 status page, 18 KB, 1 встреча, 6 профилей людей, 4 отзыва, 11 карточек Сарафана, 37 поселков Compare и 3 страницы регламента.

- [x] Нет `yandex_f6b2b7a6076fe997.html`, `815/compare/yandex_bc149371217bfd36.html`, 404 и search UI.
- [x] Нет news root, year/month archives и tag routes.
- [x] Нет `/kb/` и KB hubs `/kb/communication/`, `/kb/services/internet/`, `/kb/sos/`, `/kb/tsn/`, `/kb/ok/`, `/kb/before-you-buy/`, `/kb/court/`.
- [x] В текущих KB-данных нет реального leaf с `noindex`; focused predicate test отдельно подтверждает исключение root, hub и synthetic `noindex` page.
- [x] В review documents отсутствует повторяющийся блок «Отказ от ответственности».
- [x] В people documents отсутствует блок backlinks «Где упоминается».
- [x] Compare содержит только 37 settlement detail URLs; landing, rating, JSON и факты `900`, `Серпуховский район`, `асфальт`, `Павла Томилко` отсутствуют в Compare documents.
- [x] В regulation documents отсутствуют control labels `Включить позицию`, `Состав расчета` и `Дополнительные поля`.
- [x] Нет Markdown, JSON, RSS, ICS, schemas, OpenAPI и `llms.txt` routes.

### Browser smoke

- [x] До открытия диалога - 0 запросов `/search/`; после открытия до ввода - также 0.
- [x] Открытие с клавиатуры, focus input, `ArrowDown`, `ArrowUp`, `Escape` и возврат фокуса в фактический trigger работают.
- [x] `Enter` из выбранного результата и прямо из поля переводит на первый canonical URL; dialog после перехода закрыт и не открывается повторно.
- [x] Первая выдача содержит 8 уникальных результатов; прокрутка догружает следующие 8 без дублей и зависшего состояния.
- [x] Query-scoped cache не смешивает excerpts одного документа: запросы `категорически` и `полгода` подсвечивают разные совпадения и ведут на разные подходящие anchors одного отзыва; возврат к `категорически` снова дает исходную подсветку и anchor.
- [x] После переходов `/` -> `/news/` -> news detail -> `/status/` в DOM остается один dialog.
- [x] Production empty state проверен реальным бессмысленным запросом; error state - abort всех `/search/` в отдельной production-preview сессии.
- [x] `dev-unavailable` прошел focused component test с fake adapter.
- [x] На 320, 768, 1024 и 1440 px нет горизонтального overflow. Layout-equivalent проверка 1440 x 900 при 200% zoom выполнена как viewport 720 x 450 с DPR 2; overflow также отсутствует.
- [x] Accessibility tree сохраняет dialog, heading, labeled searchbox, results region, list и live announcement. Axe 4.12.1 для открытого dialog: 0 violations, 18 passes, один incomplete contrast rule для двух перекрытых узлов.
- [x] Релевантных console/page errors в обычном, empty, error и nginx smoke нет.
- [x] Типографика диалога соответствует системе: PT Serif для заголовков, Fira Sans для интерфейса и excerpts; оценка 10/10 по локальному responsive/zoom smoke.

### Performance method

Холодный повторный замер выполнен в отдельной сессии agent-browser Chromium 147 на 390 x 844, DPR 2. Сессия запущена с `--disable-cache` и минимальным disk/media cache. Прозрачный локальный счетчик перед свежим `pnpm preview` суммировал фактические response-body bytes всех `/search/`, включая запросы worker. HTTP-заголовки не вошли в сумму, поэтому 145 102 байта - нижняя граница transferred payload.

Warmed повторный замер выполнен на том же production bundle через instrumented production client без изменения приложения. Профиль: 390 x 844, DPR 2, CDP CPU slowdown 4x, warm HTTP cache. После прогрева Pagefind и HTTP-кеша один явно измеренный uncached client call загрузил initial-8 и заполнил query-scoped result cache. Затем 150 раз подряд измерялись raw `pagefind.search(query)` внутри клиента и полный `client.search(query, 8)`; debounce и Svelte render не включались. Основной прогон использовал прежний самый тяжелый intent длинного отзыва, контрольный - `тарифы` с 30 совпадениями и восемью материализованными результатами.

### Production-like delivery

- [x] Локальный nginx 1.30.4 принял контролируемую конфигурацию через `nginx -t`.
- [x] `scripts/smoke-pagefind-delivery.sh` получил `200`, ожидаемые MIME, cache policy, CSP и security headers для entrypoint, worker, entry JSON, CSS, WASM, metadata, index, filter и fragment.
- [x] Browser smoke через этот nginx вернул результат `Meshtastic` без CSP, worker, MIME, WASM и console errors.
- [ ] `pnpm dev` с подготовленным snapshot и live middleware.
- [ ] `pnpm dev` без snapshot и live `dev-unavailable`.
- [ ] Non-Chromium browser smoke.
- [ ] Реальный screen-reader smoke.
- [ ] Проверка реального deployed URL.
- [ ] `nginx -t` и reload в production окружении.
- [ ] Public production smoke после deploy.

Все незакрытые пункты выше относятся только к отложенным dev/public/non-Chromium/screen-reader gates. Локальных функциональных, сетевых или latency blockers больше нет.

## Вероятные файлы

- `docs/decisions/025-static-full-text-search-with-pagefind.md`
- этот план и task checklist
- focused search test files только при выявленном стабильном контракте

## Зависимости

- Задачи 01-11.

## Вне задачи

- Добавление новых поисковых возможностей после прохождения критериев.
- Оптимизация без измеренной проблемы.
