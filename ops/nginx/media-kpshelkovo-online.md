# Media origin

`media.kpshelkovo.online` проксирует публичные объекты S3 и использует отдельную статическую сборку только для локальной страницы 404.

Публичное поведение origin определяет [public-media](/openspec/specs/public-media/spec.md). Параметры бакета, структура ключей и порядок публикации через `s5cmd` — в [storage runbook](/ops/storage/public-media.md); причины выбора origin и отдельной сборки ошибки — в [ADR-019](/docs/decisions/019-public-media-origin.md) и [ADR-020](/docs/decisions/020-separate-media-error-app.md).

## Каталоги

- `/var/www/media-kpshelkovo-online` - содержимое `dist/media`.
- `/var/cache/nginx/media-kpshelkovo-online` - proxy cache S3.
- `/var/www/kpshelkovo-online/.well-known/acme-challenge` - существующий ACME webroot.

`deploy-nginx-site` создает static root до первого `rsync` и назначает владельцем пользователя, который вызвал скрипт через `sudo`. Workflow затем проверяет, что каталог доступен для записи.

## Сертификат

Хост использует сертификат `/etc/letsencrypt/live/kpshelkovo.online`. Сертификат должен содержать SAN `media.kpshelkovo.online` вместе с остальными действующими именами.

## Деплой

1. Джоба `deploy` запускает `pnpm build`, который создает `dist/media/404.html` и `dist/media/_media/` на том же runner.
2. `deploy-nginx-site` готовит static root, устанавливает site-файл, выполняет `nginx -t` и перезагружает nginx только после успешной проверки.
3. Эта же джоба синхронизирует `dist/media` в `/var/www/media-kpshelkovo-online`.

Nginx отдает `404.html` только через internal error redirect. Прямые запросы к media-origin продолжают идти в фиксированный S3 upstream, кроме зарезервированного asset-префикса `/_media/`.

## Конфигурация доставки

Точные proxy TTL, лимит дискового кеша, браузерный `Cache-Control`, методы, TLS upstream и security headers задаёт [site-конфиг](/ops/nginx/media-kpshelkovo-online.conf). Он проксирует нормализованный URI: ключи не должны различаться только повторными слешами, dot-сегментами или кодированными разделителями. `404.html` и `_media/*` зарезервированы для локальной сборки.
