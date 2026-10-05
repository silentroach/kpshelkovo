# ADR-005: CSP без `unsafe-inline` для исполняемых скриптов

## Статус

Заменён [ADR-017](/docs/decisions/017-csp-inline-exceptions-for-astro-yandex-maps.md) 2026-07-01.

## Дата

2026-05-15

## Причина замены

Проектный JavaScript вынесли в обработанные модули, а сгенерированные загрузчики Astro islands разрешили хэшами. Поддержка этих хэшей оказалась хрупкой при изменениях сборки; JS API Яндекс Карт также потребовал eval. ADR-017 закрепил документированные исключения вместо полного отказа от `unsafe-inline`.

Действующие правила проектного JavaScript находятся в [инструкциях приложения](/apps/www/AGENTS.md#клиентский-javascript), точная политика — в [security.conf](/ops/nginx/security.conf), причины исключений — в [CSP.md](/ops/nginx/CSP.md).
