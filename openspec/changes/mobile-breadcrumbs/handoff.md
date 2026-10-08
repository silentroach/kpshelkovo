# Передача в следующую сессию

Состояние на 8 октября 2026 года. Задача — [#980](https://github.com/silentroach/kpshelkovo/issues/980), рабочая ветка — `design/980-mobile-breadcrumbs`.

## Откуда продолжать

Владелец выбрал оформление «Тихий фон» по HTML-макету, затем попросил открыть PR с планом для ревью. Реализация назначена на отдельную сессию в **этой же ветке**. PR сначала содержит план; после согласования его дополняет реализация.

На момент передачи подготовлены все четыре артефакта OpenSpec; задачи реализации ещё не выполнены. Явное разрешение на реализацию после ревью плана предстоит получить. Согласование внешнего вида состоялось, а просьба опубликовать план разрешает commit, push и открытие PR с документами.

Перед началом следующей сессии:

1. Прочитать обсуждение PR этой ветки и #980, проверить фактический `git status` и актуальный change.
2. Подтвердить разрешение владельца на реализацию. После разрешения оставить в #980 отметку со ссылкой на коммит согласованного плана по корневому [процессу](/AGENTS.md#согласование-и-передача).
3. Продолжить через `openspec-apply-change` по [tasks.md](/openspec/changes/mobile-breadcrumbs/tasks.md), сохраняя рабочую ветку и существующий PR. Команды OpenSpec выполнять через `pnpm exec openspec` из корня workspace.

Объём — в [proposal.md](/openspec/changes/mobile-breadcrumbs/proposal.md), требования — в [delta spec](/openspec/changes/mobile-breadcrumbs/specs/site-navigation/spec.md), параметры и технический подход — в [design.md](/openspec/changes/mobile-breadcrumbs/design.md). Этот файл хранит контекст передачи, а не вторую версию плана.

## Визуальный ориентир

- [preview.html](/openspec/changes/mobile-breadcrumbs/preview.html) — сохранённый макет, по которому обсуждалось решение. По умолчанию выбраны «Тихий фон» и ширина примеров 390 px. Также есть 320 и 1000 px, «Без фона» и «Зелёная полоса» для сравнения.
- [quiet-390.png](/openspec/changes/mobile-breadcrumbs/quiet-390.png) — скриншот выбранного варианта: три примера шириной 390 px в окне 1280 px.
- В макете container queries имитируют ширину экрана внутри примеров. При реализации нужен breakpoint viewport из design.
- Макет перенесён из `apps/www/public/breadcrumbs-preview.html` в change при подготовке PR. Пункт 2.2 задач остаётся проверкой отсутствия временной публичной копии после реализации.

Для повторного просмотра со шрифтами сайта временно скопировать `preview.html` в `apps/www/public/breadcrumbs-preview.html` и открыть `http://localhost:4321/breadcrumbs-preview.html`. Dev-сервер в предыдущей сессии запустил владелец; в новой сессии сначала проверить его доступность, запускать `pnpm dev` только по явной просьбе. После просмотра удалить только эту временную копию из `public`.

Макет ссылается на `/static/fonts/*.woff2` по именам из dev-сервера на момент обсуждения. Если имена изменились, сверить реальные шрифтовые запросы сайта. При открытии HTML как локального файла шрифты по этим адресам не загрузятся; скриншот сохраняет согласованный вид независимо от окружения.

## Что уже проверено

- Структурная проверка `pnpm openspec:validate` прошла при подготовке плана; `openspec status` показал 4/4 артефакта. Это результат проверки документов.
- В браузере при ширине примера 390 px подтверждены фон `oklch(0.98 0.003 125)`, цвет ссылок `oklch(0.46 0.02 135)`, поля по 12 px, примыкание к меню и отсутствие горизонтального переполнения макета.
- Визуально просмотрен сохранённый скриншот. Переключение на зелёную полосу сохранило её исходный фон, зелёные ссылки и поля 16 px.
- Компонентные тесты, typecheck и сборка реализации ещё впереди. Проверки макета не подтверждают работу реальных обёрток страниц, фокуса и печатного представления — они перечислены в задачах.
- Браузерная сессия исследования закрыта; пользовательский dev-сервер агент не останавливал.

## Полезные точки входа

- [Breadcrumbs.astro](/packages/ui/src/Breadcrumbs.astro) и [существующие визуальные тесты](/packages/ui/tests/breadcrumbs.visual.local.spec.ts). Конфликт мобильного скрытия с поздним `display: flex` разобран в design.
- [Новость](/apps/www/src/pages/news/[year]/[month]/[entry]/index.astro): разные обёртки с обложкой и без неё. [Профиль](/apps/www/src/pages/people/[slug]/index.astro) и [сравнение поселка](/apps/www/src/pages/815/compare/settlements/[slug]/index.astro) также требуют отдельной проверки геометрии.
- [Страница мероприятия](/apps/www/src/pages/events/[year]/[month]/[entry].astro): сохранить переходы к месяцу и дню. Полный список потребителей находится поиском `<Breadcrumbs` в `apps/www/src`.
- [Дизайн-гайд](/docs/design/design-code-shelkovo.md), [токены](/apps/www/src/styles/tokens.css), [ADR-034](/docs/decisions/034-native-css-architecture.md) и основные specs [site-navigation](/openspec/specs/site-navigation/spec.md), [events-calendar](/openspec/specs/events-calendar/spec.md), [knowledge-base](/openspec/specs/knowledge-base/spec.md), [content-print](/openspec/specs/content-print/spec.md).

Исходные реальные страницы для сравнения с макетом:

- `/map/shelkovo-memorial/`;
- `/kb/before-you-buy/who-manages/`;
- `/events/2026/09/green-dreams-kids-cinema-quiz-2026-09-19/`.

Источники, использованные при обсуждении вариантов:

- [Nielsen Norman Group — Breadcrumbs](https://www.nngroup.com/articles/breadcrumbs/).
- [GOV.UK Design System — Breadcrumbs](https://design-system.service.gov.uk/components/breadcrumbs/).
- [Baymard — Mobile hierarchy breadcrumbs](https://baymard.com/research-articles/implementing-mobile-hierarchy-breadcrumbs).
