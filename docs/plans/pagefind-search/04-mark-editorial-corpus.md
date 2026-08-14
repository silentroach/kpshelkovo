# Задача 04: Разметить статус, базу знаний и встречи

## Цель

Добавить в корпус редакционные и справочные страницы, которые дают самостоятельный ответ пользователю.

## Объем работы

- Индексировать detail pages инцидентов статуса целиком.
- На service pages статуса индексировать только уникальную текущую сводку и описание, не повторный список инцидентов.
- Индексировать только leaf pages базы знаний без флага `noindex`.
- Считать KB source с именем `index.md` hub-страницей и не индексировать его независимо от текущего числа дочерних материалов.
- Не индексировать `/kb/` и остальные hub/collection pages, даже если у них есть собственное вводное содержание.
- Индексировать meeting context, speakers и transcript.
- Сохранить heading anchors встречи, чтобы Pagefind мог вернуть deep link на найденный раздел.
- Исключить навигационные, action-only и повторяющиеся блоки.

Section landing pages без уникального ответа остаются вне корпуса.

## Критерии приемки

- Уникальные фразы из incident, KB и meeting pages находят канонические URLs.
- KB pages с `noindex`, KB root и страницы с дочерними материалами отсутствуют в выдаче.
- Совпадение внутри длинной встречи может вести на стабильный heading anchor.

## Проверка

- Запустить production build.
- Вручную проверить по одному характерному запросу для status, KB и meetings.
- Для KB проверить одну leaf page и один hub с дочерними материалами.
- Не добавлять unit tests на набор статических routes.

## Вероятные файлы

- `apps/www/src/pages/status/incidents/[year]/[month]/[entry]/index.astro`
- `apps/www/src/pages/status/[service]/index.astro`
- `apps/www/src/pages/kb/[...slug].astro`
- `apps/www/src/pages/meetings/[slug]/index.astro`

## Зависимости

- Задачи 02 и 03.

## Вне задачи

- Изменение редакционного контента.
- Индексация Markdown companions и transcript Markdown routes.
