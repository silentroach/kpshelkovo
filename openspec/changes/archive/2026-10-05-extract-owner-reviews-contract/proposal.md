# Proposal

## Why

В [#786](https://github.com/silentroach/kpshelkovo/issues/786), части [#776](https://github.com/silentroach/kpshelkovo/issues/776), нужно собрать действующие правила отзывов из [ADR-016](/docs/decisions/016-markdown-first-owner-reviews.md) и [ADR-029](/docs/decisions/029-review-aspects-as-organization-reviews.md). Сейчас подробная схема и уже заменённая JSON-LD-модель затрудняют чтение редакционного контракта.

## What Changes

- Выделить `owner-reviews`: проверка текущего собственника вне сайта, сохранение авторского текста, необязательная публичная подпись и граница приватных материалов.
- Сохранить независимые оценки и тексты аспектов места, застройщика и обслуживания, отсутствие общей оценки и агрегатов в списке и отдельном отзыве.
- Зафиксировать действующую JSON-LD-модель: полный материал в `ItemPage` о `Place`, отдельные оценённые аспекты организаций в `Review` с одним рейтингом и только своим текстом, ссылки на `ItemPage` в списке.
- Сократить ADR до причин принятых решений, согласовать индекс и ссылки. ADR-029 заменяет только JSON-LD из ADR-016 и не разрешает средние оценки.

### Границы

Точные юридические формулировки принадлежат [правилам публикации](/apps/www/src/data/review-rules.md) и сохраняются дословно. Иллюстрации и GPS-политика принадлежат [#788](https://github.com/silentroach/kpshelkovo/issues/788). Общий HTTP/discovery-контракт ведёт [#781](https://github.com/silentroach/kpshelkovo/issues/781), будущий change `extract-public-representations-contracts`; общие упоминания — [#779](https://github.com/silentroach/kpshelkovo/issues/779), будущий `extract-entity-mentions-contract`.

## Capabilities

### New Capabilities

- `owner-reviews`: авторство, публикация, независимые аспекты и соответствие структурированных данных видимому предмету оценки.

### Modified Capabilities

Нет.

## Impact

Документационный перенос без изменения модерации, рейтингов, исходников отзывов или runtime. Основание — [редакционные правила](/apps/www/src/data/reviews/AGENTS.md), [schema](/apps/www/src/lib/reviews/raw-schema.ts), [Markdown](/apps/www/src/lib/reviews/markdown.ts), [JSON-LD](/apps/www/src/lib/reviews/seo.ts) и [существующие тесты](/apps/www/src/lib/reviews/tests). Самостоятельной основной spec отзывов пока нет. После согласования меняются ADR, индекс и ссылки. Production-приёмка не требуется.
