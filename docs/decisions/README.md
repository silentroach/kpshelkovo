# Архитектурные решения

Хранилище ADR: короткие записи о технических и продуктово-архитектурных решениях, которые важно помнить будущим людям и агентам.

## Список ADR

- [ADR-001: Упоминания по слагу в Markdown](001-markdown-slug-mentions.md) - принят, 2026-05-13.
- [ADR-002: Client transitions, hover prefetch и кеширование HTML](002-client-transitions-prefetch-cache.md) - принят, 2026-05-14.
- [ADR-003: Слоистый Markdown-рендер](003-markdown-pipeline-layering.md) - принят, 2026-05-14.
- [ADR-004: Lighthouse-профиль без аналитики](004-lighthouse-analytics-profile.md) - принят, 2026-05-15.
- [ADR-005: CSP без `unsafe-inline` для исполняемых скриптов](005-csp-inline-script-policy.md) - заменен ADR-017, 2026-05-15.
- [ADR-006: HSTS без `includeSubDomains` и `preload`](006-hsts-policy.md) - принят, 2026-05-15.
- [ADR-007: COOP без COEP для изоляции `opener`-связей](007-coop-origin-isolation.md) - принят, 2026-05-15.
- [ADR-008: Генерация Markdown через AST](008-markdown-ast-generation.md) - принят, 2026-05-14.
- [ADR-009: Markdown через `Accept` negotiation](009-markdown-accept-negotiation.md) - принят, 2026-05-17.
- [ADR-010: Плановые работы в индикаторе статуса на главной](010-home-status-maintenance-indicator.md) - принят, 2026-05-18.
- [ADR-011: Реестр публичных поверхностей](011-public-surface-registry.md) - принят, 2026-05-19.
- [ADR-012: Единый граф упоминаний сущностей в Markdown](012-entity-mention-graph.md) - принят, 2026-05-20.
- [ADR-013: Граница между внешними DTO, доменной моделью и публичными DTO](013-raw-domain-public-data-boundary.md) - принят, 2026-05-20.
- [ADR-014: Transcript-first архив встреч](014-meetings-transcript-first-archive.md) - принят, 2026-06-07.
- [ADR-015: Markdown-first база знаний поселка](015-markdown-first-knowledge-base.md) - принят, 2026-06-16.
- [ADR-016: Markdown-first отзывы собственников](016-markdown-first-owner-reviews.md) - принят, 2026-06-25.
- [ADR-017: CSP с inline-исключениями для Astro и Яндекс Карт](017-csp-inline-exceptions-for-astro-yandex-maps.md) - принят, 2026-07-01.
- [ADR-018: Markdown-first сарафан](018-markdown-first-useful-contacts.md) - принят, 2026-07-06.
- [ADR-019: Публичный media-origin через nginx перед S3](019-public-media-origin.md) - принят, 2026-07-10.
- [ADR-020: Отдельное Astro-приложение для media error pages](020-separate-media-error-app.md) - принят, 2026-07-11.
- [ADR-021: Публичные файлы разделов в S3](021-public-section-files-in-s3.md) - принят, 2026-07-13.
- [ADR-022: Разрешить использование публичного контента системами ИИ](022-ai-content-signals-policy.md) - принят, 2026-07-22.
- [ADR-023: Оригиналы фотографий новостей в публичном S3](023-news-images-in-public-s3.md) - принят, 2026-07-23.
- [ADR-024: Иллюстрации отзывов в публичном S3](024-review-images-in-public-s3.md) - принят, 2026-08-10.
- [ADR-025: Статический полнотекстовый поиск через Pagefind](025-static-full-text-search-with-pagefind.md) - принят, 2026-08-14.
- [ADR-026: IndexNow после статического deploy](026-indexnow-after-static-deploy.md) - заменён ADR-027, 2026-08-16.
- [ADR-027: IndexNow только для новых страниц](027-indexnow-new-pages-only.md) - принят, 2026-08-16.
- [ADR-028: Markdown-first карта мест с типизированными маркерами](028-markdown-first-places-map.md) - принят, 2026-08-19.
- [ADR-029: Аспектные оценки как отзывы об организациях](029-review-aspects-as-organization-reviews.md) - принят, 2026-08-20.
- [ADR-030: Нормализованные источники детальной сметы](030-normalized-estimate-detail-sources.md) - принят, 2026-08-26.
