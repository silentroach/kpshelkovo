# Proposal

## Why

В [#787](https://github.com/silentroach/kpshelkovo/issues/787), части [#776](https://github.com/silentroach/kpshelkovo/issues/776), нужно восстановить актуальный контракт «Сарафана». [ADR-018](/docs/decisions/018-markdown-first-useful-contacts.md) одновременно содержит старые ограничения MVP и последующие решения о самостоятельных карточках.

## What Changes

- Выделить `contacts-catalog`: каталог без гарантии качества, карточки даже при пустом body, название и доступное описание со ссылкой в списках, контактные данные и vCard в карточках.
- Зафиксировать редакционные выжимки положительного, нейтрального и отрицательного опыта с источниками и существенными оговорками; отсутствие отзыва отличается от нейтрального опыта.
- Сохранить правило звезды: минимум пять положительных записей и ни одной отрицательной; нейтральные не увеличивают порог и не блокируют звезду. Отдельные подтверждённые заказы одного автора остаются отдельными записями; повторные рассказы об одном заказе дедуплицируются.
- Сократить ADR до причин отдельного каталога и его позиционирования, согласовать индекс и ссылки, исключить отменённые ограничения и переписывание raw-схемы.

### Подтверждённые решения и границы

Структурированные отзывы приняты в [3657de7](https://github.com/silentroach/kpshelkovo/commit/3657de7679e8cfe88177ec4e688a54e0d9ac9841). Размещение контактов подтверждено [#269](https://github.com/silentroach/kpshelkovo/issues/269) и [PR #273](https://github.com/silentroach/kpshelkovo/pull/273); отдельные заказы одного автора — [PR #918](https://github.com/silentroach/kpshelkovo/pull/918). Число записей не приравнивается к числу независимых рекомендателей; идентификаторы авторов не вводятся.

Упоминания уже работают в body, но не в выжимках отзывов. Общий контракт упоминаний ведёт [#779](https://github.com/silentroach/kpshelkovo/issues/779), будущий change `extract-entity-mentions-contract`; HTTP/discovery — [#781](https://github.com/silentroach/kpshelkovo/issues/781), будущий `extract-public-representations-contracts`. Связь `place_slug` остаётся отдельной открытой [#188](https://github.com/silentroach/kpshelkovo/issues/188); поиск и новые функции каталога в перенос не входят.

## Capabilities

### New Capabilities

- `contacts-catalog`: редакционная достоверность каталога, самостоятельные карточки, учёт отзывов и контактные действия.

### Modified Capabilities

Нет.

## Impact

Документационный перенос с опорой на [редакционные правила](/apps/www/src/data/contacts/AGENTS.md), [raw-схему](/apps/www/src/lib/contacts/raw-schema.ts), [mapper](/apps/www/src/lib/contacts/mapper.ts), [Markdown](/apps/www/src/lib/contacts/markdown.ts), [vCard](/apps/www/src/lib/contacts/vcard.ts) и [тесты](/apps/www/src/lib/contacts/tests). Самостоятельной основной spec каталога пока нет. После согласования меняются ADR, индекс и ссылки; данные, поля и runtime сохраняются. Production-приёмка не требуется.
