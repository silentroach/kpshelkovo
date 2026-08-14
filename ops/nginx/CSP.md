# CSP для kpshelkovo.online

Источник истины: `ops/nginx/kpshelkovo-online.conf`, заголовок `Content-Security-Policy`.

Этот документ объясняет текущую политику и причины исключений. Процессные правила изменения CSP лежат в `ops/nginx/AGENTS.md`.

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

`frame-ancestors 'self'`

- Разрешает встраивать страницы только с текущего источника.
- Не дает внешним сайтам открывать страницы внутри iframe.

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

`frame-src 'self' https://yandex.ru`

- Same-origin фреймы разрешены для внутренних сценариев.
- `https://yandex.ru` нужен для виджетов Яндекс Карт, встроенных через `<iframe>`.

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
- Скрипты: `https://mc.yandex.ru`, `https://mc.yandex.com`.
- Соединения: `https://mc.yandex.ru`, `https://mc.yandex.com`, `wss://mc.yandex.ru`, `wss://mc.yandex.com`.
- Beacon-изображения: `https://mc.yandex.ru`, `https://mc.yandex.com`.
- Документация Метрики также описывает `child-src` и `frame-src` для Вебвизора, карт кликов, ссылок и скроллинга. Эти источники не добавлены, потому что в текущей инициализации счетчика `webvisor: false` и `clickmap: false`.

Яндекс Карты через iframe-виджеты:

- Фреймы: `https://yandex.ru`.
- Изображения и подключенные ресурсы карты могут загружаться с доменов Яндекс Карт внутри iframe, но ими управляет CSP самой страницы внутри iframe.

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
