# Proposal

## Why

В [#788](https://github.com/silentroach/kpshelkovo/issues/788), части [#776](https://github.com/silentroach/kpshelkovo/issues/776), долговечные обещания публичных файлов смешаны с командами и настройками в ADR-019/020/021/023/024. Нужен один контракт, различающий точные доказательные копии, подготовленные JPEG и заменяемый текущий портрет.

## What Changes

- Выделить `public-media`: стабильный media-origin, чтение GET/HEAD, отсутствие версий в query и локальная 404 для upstream 403/404.
- Закрепить сохранность байтов документов и исходных KB-изображений, историю редакций и смысл даты снимка; опасные метаданные исходника останавливают публикацию.
- Сохранить неизменяемость подготовленных JPEG новостей/отзывов и разные правила GPS. Заменяемые портреты остаются исключением с владельцем [people-photos](/openspec/specs/people-photos/spec.md).
- После согласования оставить причины выбора в ADR, команды, точные cache/JPEG-параметры и проверки — в [storage runbook](/ops/storage/public-media.md), маршрутизацию публикации — в `public-media-publisher`. Уточнить термин «оригинал» для подготовленного news web-master в затронутой документации.

## Capabilities

### New Capabilities

- `public-media`: публичная доставка файлов, сохранность доказательств, владение и неизменяемость публикационных объектов.

### Modified Capabilities

Нет.

## Impact

- Источники: [ADR-019](/docs/decisions/019-public-media-origin.md), [ADR-020](/docs/decisions/020-separate-media-error-app.md), [ADR-021](/docs/decisions/021-public-section-files-in-s3.md), [ADR-023](/docs/decisions/023-news-images-in-public-s3.md), [ADR-024](/docs/decisions/024-review-images-in-public-s3.md); граница исключения — [ADR-040](/docs/decisions/040-people-portraits-in-public-s3.md) и `people-photos`.
- Объём реализации — документация, ссылки и направление skill к владельцам правил. Сравнение конфликтующих байтов обязательно и для недатированных PDF `/815/regulation`; отсутствие даты не разрешает перезапись.
- Долгий immutable Cache-Control метаданных S3 и короткий браузерный TTL nginx — разные уровни. Точные значения и инструменты остаются в runbook, а не становятся вечными требованиями spec.
- Бакетные операции, загрузки, удаления, изменение ops-конфигурации и поведения сайта в этот перенос не входят. Production-приёмка не требуется; реализация ждёт отдельного разрешения владельца на готовые артефакты.
