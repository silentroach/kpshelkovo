# CSP для kpshelkovo.online

Источник истины: `ops/nginx/security.conf`, заголовок `Content-Security-Policy`.

Этот документ объясняет текущую политику и причины исключений. Процессные правила изменения CSP лежат в `ops/nginx/AGENTS.md`.

## Подключение заголовков

`kpshelkovo-online.conf` подключает файл через `include /etc/nginx/kps/security.conf` на уровне `server` и в каждом `location` со своим `add_header`. Nginx читает include при загрузке конфигурации; заголовки заданы строками, без присваивания переменных на каждом запросе. Повторный include нужен из-за правил наследования `add_header`. Параметр `always` сохраняет заголовки и на ответах с ошибками.

Workflow доставляет include рядом с site-файлом в `/tmp` с суффиксом `.conf.new`. `deploy-nginx-site` устанавливает его в `/etc/nginx/kps` до `nginx -t`; при ошибке проверки восстанавливает оба файла. Назначение каждого заголовка описано в комментариях include-файла.

## Принципы политики

- По умолчанию ресурсы разрешены только с текущего источника (origin).
- Внешние сервисы разрешены явно и только в тех директивах, которые им нужны.
- Широкие источники вроде `https:` или `*` не используются.
- `unsafe-eval` разрешен из-за JS API Яндекс Карт v3: официальная документация требует его для работы векторного движка при парсинге тайлов. Pagefind также использует уже существующее разрешение для компиляции WebAssembly, но не требует расширять политику.
- Wildcard оставлены только там, где внешний сервис использует много служебных поддоменов.

## Базовые директивы

`default-src 'self'`

- Резервная политика только на текущий источник.
- Новые типы ресурсов не должны автоматически разрешаться через широкую резервную политику.

`base-uri 'self'`

- Блокирует внедренные теги `<base>`, которые могут переписать относительные URL на другой источник.

`object-src 'none'`

- Запрещает устаревшее выполнение через object/embed/plugin.

`frame-ancestors 'self' https://metrika.yandex.ru`

- Сохраняет возможность встраивать страницы с текущего источника.
- Разрешает интерфейсу Яндекс Метрики открыть страницу для поведенческих отчетов.
- Не дает остальным внешним сайтам открывать страницы внутри iframe.

`form-action 'self'`

- Ограничивает отправку форм текущим сайтом.

`script-src-attr 'none'`

- Блокирует inline-обработчики в атрибутах, например `onclick="..."`.
- Inline-блоки `<script>` регулируются отдельно через `script-src`.

`manifest-src 'self'`

- Манифест веб-приложения должен загружаться только с этого сайта.

## Скрипты сайта

`script-src 'self' 'unsafe-inline' 'unsafe-eval' https://mc.yandex.ru https://mc.yandex.com https://api-maps.yandex.ru https://*.api-maps.yandex.ru https://yastatic.net`

- `'self'` нужен для собранных Astro-ассетов в `/static/` и runtime Pagefind в `/search/`.
- `'unsafe-inline'` сейчас нужен, потому что Astro генерирует inline bootstrap-скрипты и загрузчики islands прямо в HTML.
- `https://mc.yandex.ru` и `https://mc.yandex.com` нужны для Яндекс Метрики.
- `https://api-maps.yandex.ru` нужен для JS API Яндекс Карт v3.
- `https://*.api-maps.yandex.ru` нужен для ресурсов JS API Яндекс Карт v3 на служебных поддоменах.
- `https://yastatic.net` нужен для рантайм-бандлов Яндекс Карт, которые загружает API.
- `'unsafe-eval'` нужен Яндекс Картам для работы векторного движка при парсинге тайлов. Без него возможны ошибки вида `vector: internal error`. Это же существующее разрешение покрывает компиляцию WebAssembly в Pagefind 1.5.2; отдельное исключение для поиска не добавлено.

## Сетевые запросы

`connect-src 'self' https://mc.yandex.ru https://mc.yandex.com wss://mc.yandex.ru wss://mc.yandex.com https://api-maps.yandex.ru https://*.api-maps.yandex.ru https://*.maps.yandex.net https://*.maps.yandex.ru https://*.yandex.ru`

- `'self'` покрывает same-origin API, запросы данных и загрузку Pagefind metadata, index chunks и fragments из `/search/`.
- Яндекс Метрика использует HTTPS и WebSocket точки доступа на `mc.yandex.ru` и `mc.yandex.com`.
- JS API Яндекс Карт использует `api-maps.yandex.ru` и служебные поддомены `*.api-maps.yandex.ru`.
- Яндекс Карты загружают стили карты, списки объектов, тайлы и renderer-данные с `*.maps.yandex.net`, `*.maps.yandex.ru` и части точек доступа `*.yandex.ru`.

## Изображения и тайлы карт

`img-src 'self' data: blob: https://media.kpshelkovo.online https://mc.yandex.ru https://mc.yandex.com https://api-maps.yandex.ru https://*.api-maps.yandex.ru https://*.maps.yandex.net https://*.yandex.ru https://yastatic.net`

- `'self'` покрывает локальные изображения и собранные ассеты.
- `data:` и `blob:` разрешают встроенные и сгенерированные изображения, которые могут использоваться кодом сайта или сторонними виджетами.
- `https://media.kpshelkovo.online` отдает изображения из публичного S3-бакета через контролируемый nginx-прокси.
- Яндекс Метрика использует image-beacon запросы.
- Яндекс Карты могут загружать растровые ресурсы и ассеты карты с доменов API, map tiles и `yastatic.net`.

## Аудио и видео

`media-src 'self' https://media.kpshelkovo.online`

- `'self'` сохраняет загрузку локальных аудио- и видеофайлов.
- `https://media.kpshelkovo.online` разрешает воспроизводить файлы из публичного S3-бакета через nginx-прокси.

## Стили и шрифты

`style-src 'self' 'unsafe-inline' https://api-maps.yandex.ru https://*.api-maps.yandex.ru https://yastatic.net`

- `'self'` покрывает собранные CSS-ассеты.
- `'unsafe-inline'` нужен для сгенерированных inline-стилей и стилей сторонних виджетов.
- `https://api-maps.yandex.ru`, `https://*.api-maps.yandex.ru` и `https://yastatic.net` покрывают рантайм-стили Яндекс Карт.

`font-src 'self' data: https://yastatic.net`

- `'self'` покрывает шрифты, собранные вместе с сайтом.
- `data:` разрешает встроенные и сгенерированные данные шрифтов, если браузер или виджет использует такой формат.
- `https://yastatic.net` покрывает шрифты UI Яндекс Карт.

## Фреймы

`frame-src 'self' https://mc.yandex.ru https://mc.yandex.com`

- Same-origin фреймы разрешены для внутренних сценариев.
- Встроенные карты используют общий JS API v3. После удаления iframe из `NewsEventCard` потребителей `frame-src https://yandex.ru` в исходниках нет, поэтому это разрешение удалено. Обычным ссылкам на Яндекс Карты `frame-src` не нужен.
- `https://mc.yandex.ru` и `https://mc.yandex.com` нужны для служебного скрытого фрейма Яндекс Метрики `/metrika/match.html`. Метрика использует оба хоста; разрешения в `script-src` и `connect-src` не разрешают загрузку iframe.

JS API Яндекс Карт v3 не является iframe. Для него нужны `script-src`, `connect-src`, `img-src`, `style-src`, `font-src` и `worker-src`.

## Воркеры

`worker-src 'self' blob: data: https://api-maps.yandex.ru https://*.api-maps.yandex.ru https://yastatic.net`

- `'self'` разрешает same-origin воркер Pagefind `/search/pagefind-worker.js`.
- `blob:` разрешает обертку воркера Pagefind и воркеры, созданные из собранного или сгенерированного кода.
- `data:` нужен JS API Яндекс Карт v3. API создает небольшие `data:application/javascript` обертки воркеров, которые вызывают `importScripts(...)` для worker-бандлов с `https://yastatic.net`.
- `https://api-maps.yandex.ru`, `https://*.api-maps.yandex.ru` и `https://yastatic.net` перечислены в официальных CSP-правилах Яндекс Карт для `worker-src`.

## Известные интеграции

Яндекс Метрика:

- Официальная справка: `https://yandex.ru/support/metrica/ru/code/install-counter-csp`.
- Родительский фрейм для поведенческих отчетов: `https://metrika.yandex.ru`.
- Скрипты: `https://mc.yandex.ru`, `https://mc.yandex.com`.
- Соединения: `https://mc.yandex.ru`, `https://mc.yandex.com` и соответствующие WebSocket-адреса.
- Beacon-изображения: `https://mc.yandex.ru`, `https://mc.yandex.com`.
- Служебный фрейм: `https://mc.yandex.ru/metrika/match.html`, `https://mc.yandex.com/metrika/match.html`.
- В текущей инициализации карта кликов и Вебвизор отключены.

JS API Яндекс Карт v3:

- Официальная справка: `https://yandex.ru/maps-api/docs/js-api/common/connection/csp.html`.
- Загрузчик API: `https://api-maps.yandex.ru`, подключается с параметром `csp=202512` для режима фиксированных CSP-правил Яндекса.
- Служебные поддомены API: `https://*.api-maps.yandex.ru`.
- Рантайм-бандлы, стили, шрифты, изображения и worker-скрипты: `https://yastatic.net`.
- Данные карт через fetch/xhr: `https://*.maps.yandex.net`, `https://*.maps.yandex.ru`, `https://*.yandex.ru`.
- Обертки воркеров: `data:` и иногда `blob:`.
- Векторный движок требует `'unsafe-eval'` для парсинга тайлов; это указано в официальной документации Яндекс Карт.

Pagefind 1.5.2:

- Официальная справка по hosting и CSP: `https://pagefind.app/docs/hosting/`.
- Runtime, WebAssembly, metadata и шардированный индекс загружаются только с текущего origin из `/search/`; внешних источников нет.
- `connect-src 'self'` покрывает fetch-запросы metadata, index chunks и fragments.
- `worker-src 'self' blob:` покрывает same-origin worker и создаваемую Pagefind worker-обертку.
- Pagefind компилирует WebAssembly. Рекомендованный Pagefind токен `'wasm-unsafe-eval'` отдельно не добавлен, потому что текущий более широкий `'unsafe-eval'` уже нужен Яндекс Картам и фактически разрешает эту компиляцию.

## Проверенные запросы JS API

При локальной проверке 18 сентября 2026 года настоящий SDK 3.0.21108841 обращался к следующим источникам:

- `api-maps.yandex.ru/v3/` — `Script`, разрешён в `script-src`; `/services/coverage/v2` — `Fetch`, разрешён в `connect-src`.
- `yastatic.net/.../maps-front-jsapi-3/...` — JS/CSS-бандлы в `script-src` и `style-src`, worker-бандлы `content_provider.worker.js` и `gltf_decoder.worker.js`. Для обёрток воркеров и загрузки их кода сохраняются существующие `worker-src` и `script-src`.
- `core-renderer-tiles.maps.yandex.net` — `Fetch` для `/style`, `/vmap3/tiles`, `/vmap3/icons` и `/fonts/*`, покрывается `connect-src https://*.maps.yandex.net`. Тип запроса важнее MIME: PNG-иконки и глифы здесь загружаются через fetch, а не через `img-src` или `font-src`.
- Тот же `core-renderer-tiles.maps.yandex.net/tiles` — `Image` в baseline поселка, покрывается `img-src https://*.maps.yandex.net`.
- `log.api-maps.yandex.ru/services/logging/watch/...` — `Fetch`, покрывается `connect-src https://*.api-maps.yandex.ru`; на границе замера запрос ещё не завершён.
- `mc.yandex.ru/metrika/match.html` — служебный фрейм Метрики. Его XHR к `hdrc.yandex.net` и `mdd.yandex.net` выполняются внутри внешнего iframe и не требуют расширять `connect-src` родительской страницы.

Все наблюдавшиеся источники JS API уже разрешены. Существующие разрешения SDK сохранены: отсутствие источника в одном наборе кадров не доказывает, что он больше не нужен. Запросы `/ads/` и рекламных партнёров прежнего `map-widget` внутри iframe не служат основанием для расширения CSP сайта.

## Локальная проверка актуальной CSP

Для проверки раздавать свежую сборку с enforced-заголовком `Content-Security-Policy`, прочитанным из актуального `security.conf`, и сверять заголовок в ответе HTML. Обычный статический сервер без CSP и режим Report-Only не проверяют применение политики. Собирать Console и Network с начала навигации, включая workers и дочерние фреймы.

В [PR #763](https://github.com/silentroach/kpshelkovo/pull/763) проверены интерактивные карты мест и сравнения, превью точки и контуров, шапка поселка и новости с одним и несколькими событиями. На `localhost` настоящий API работает без CSP-нарушений при 390/1440 px, resize и Astro-навигации. Картографических iframe нет; разрешения SDK и служебных фреймов Метрики сохранены.

Перед reload nginx выполнить `nginx -t` в окружении деплоя. Основной site-конфиг уже подключает `security.conf` во всех затронутых HTML locations со своим `add_header`.
