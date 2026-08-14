# Задача 02: Ввести HTML-контракт и пилотную индексацию новостей

## Цель

Создать один типизированный способ включать страницу в Pagefind и доказать его на detail pages новостей.

## Контекст

Страница без `search` в `BaseLayout` не должна индексироваться. Контракт поддерживает два scope:

- `page`: весь content-slot считается поисковым body;
- `manual`: layout публикует metadata, а шаблон сам расставляет один или несколько `data-pagefind-body`.

Metadata должны использовать чистый пользовательский title, section id/label, description и optional date. Значения остаются в production HTML.

## Объем работы

- Вынести readonly search types и стабильные section definitions в отдельные TypeScript-модули.
- Добавить optional `search` prop в `BaseLayout`.
- Для scope `page` ставить `data-pagefind-body` на текущую content-wrapper внутри layout.
- Для scope `manual` не ставить автоматический body marker.
- Публиковать metadata и section filter без влияния section/date на ranking.
- Подключить контракт к detail template новости как первый сквозной пример.
- Явно исключить related или action-only блоки новости, если они создают дублирование.

## Критерии приемки

- После build Pagefind индексирует detail pages новостей и не индексирует news archives, tags, 404 и verification HTML.
- Результат новости содержит чистые title, section label, canonical URL, description/excerpt и дату.
- Scope `manual` доступен сложным страницам, но не включает их автоматически.

## Проверка

- Запустить typecheck и production build приложения.
- Выполнить два ручных запроса по уникальным фразам из новостей и проверить URLs.
- Не делать snapshot полного HTML или Pagefind metadata.

## Вероятные файлы

- `apps/www/src/lib/search/types.ts`
- `apps/www/src/lib/search/sections.ts`
- `apps/www/src/layouts/BaseLayout.astro`
- `apps/www/src/pages/news/[year]/[month]/[entry]/index.astro`
- `apps/www/pagefind.yml`

## Зависимости

- Задача 01.

## Вне задачи

- Остальные разделы корпуса.
- Видимый поисковый UI.
- Видимые section filters.
