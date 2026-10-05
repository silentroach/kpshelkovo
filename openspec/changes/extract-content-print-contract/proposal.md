# Proposal

## Why

В [#790](https://github.com/silentroach/kpshelkovo/issues/790), части [#776](https://github.com/silentroach/kpshelkovo/issues/776), нужно отделить результат печати от CSS и истории приёмки в [ADR-037](/docs/decisions/037-content-print-css.md). Читателю нужен полный и читаемый материал, а поддержке — один действующий контракт без второй версии содержимого.

## What Changes

- Выделить `content-print` для всего `/kb/` и `/news/`, включая списки, архивы, теги и страницы-разделы: существующее содержимое, источники, телефоны, изображения и подписи при скрытом интерфейсе.
- Сохранить подчёркнутые ссылки на своих местах, отсутствие дописанных URL, отдельной кнопки печати и служебных подписей сайта; сохранить загрузку изображений без прокрутки и читаемое разбиение страниц.
- Сократить ADR до выбора штатной печати существующего DOM и причины eager-загрузки вместо асинхронного `beforeprint`, согласовать индекс и ссылки.

### Владельцы смежных правил

Печать загруженных редакционных карт, включая сцену, атрибуцию, подпись и кадр, уже принадлежит [site-maps](/openspec/specs/site-maps/spec.md#requirement-markdown-карта-остаётся-содержимым-печатной-страницы). Общий print-контракт ссылается на неё; нового ожидания всех внешних ресурсов перед системным диалогом нет. Владение CSS сохраняется за [ADR-034](/docs/decisions/034-native-css-architecture.md) и [#791](https://github.com/silentroach/kpshelkovo/issues/791).

## Capabilities

### New Capabilities

- `content-print`: полнота и читаемость штатной печати контента справки и новостей.

### Modified Capabilities

Нет. [knowledge-base](/openspec/specs/knowledge-base/spec.md) задаёт публикацию KB, а `site-maps` уже владеет результатом печати карт.

## Impact

Документационный перенос; основание — [print.css](/apps/www/src/styles/print.css), подключение в [BaseLayout](/apps/www/src/layouts/BaseLayout.astro) и существующая [проверка eager-изображений](/apps/www/src/lib/markdown/render.test.ts). Охват разделов, DOM, CSS и загрузка не меняются.

В [PR #728](https://github.com/silentroach/kpshelkovo/pull/728) Safari на компьютере и физические iPhone/Android остались непроверенными. Для редакционных карт владелец [снял браузерную/системную печать с критериев готовности #819](https://github.com/silentroach/kpshelkovo/issues/819#issuecomment-5798818614); доступен [протокол раннего пробника](/docs/research/editorial-maps/print-acceptance.md). Эти ограничения сохраняются в истории приёмки. Документационный перенос не объявляет их пройденными и не требует новой браузерной матрицы, smoke-обхода или snapshots. Production-приёмка не требуется.
