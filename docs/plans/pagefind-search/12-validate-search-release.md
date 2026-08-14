# Задача 12: Проверить качество и выпустить поиск

## Цель

Проверить полный корпус, русский поиск, сетевой бюджет и интерфейс перед production release без создания хрупкой большой test suite.

## Объем работы

- Собрать полный production artifact после задач 01-10.
- Проверить небольшой фиксированный query matrix по главным разделам.
- Проверить русскую морфологию на парах `тариф`/`тарифы` и `вода`/`воды`.
- Проверить, что 404, verification, `noindex`, archives, tags и повторяющие lists отсутствуют.
- Измерить Pagefind network payload холодного типичного запроса.
- Измерить warmed search latency на согласованном среднем mobile profile.
- Проверить отсутствие запросов `/pagefind/` до открытия поиска.
- Выполнить keyboard, screen-reader smoke, 200% zoom и responsive проверку.
- После успешного release добавить короткую implementation note в ADR-025.

Пример query matrix должен содержать реальные устойчивые намерения, а не точные строки случайных заголовков. Достаточно 8-12 запросов на весь сайт.

## Критерии приемки

- Ожидаемые canonical URLs входят в первые релевантные результаты, а исключенные страницы не находятся.
- Холодный типичный запрос укладывается в 300 КБ Pagefind-ресурсов, warmed p95 - в 100 мс.
- Search dialog проходит production browser smoke без console errors и доступен на целевых viewport/zoom режимах.

## Проверка

- Запустить `pnpm typecheck`, focused tests поиска и `pnpm build`.
- Проверить production-like preview через browser Network, Console и accessibility tree.
- Не фиксировать полный index snapshot, точный порядок всей выдачи или Lighthouse как отдельный обязательный тест.

## Вероятные файлы

- `docs/decisions/025-static-full-text-search-with-pagefind.md`
- этот план и task checklist
- focused search test files только при выявленном стабильном контракте

## Зависимости

- Задачи 01-11.

## Вне задачи

- Добавление новых поисковых возможностей после прохождения критериев.
- Оптимизация без измеренной проблемы.
