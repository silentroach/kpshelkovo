# Задача 06: Разметить страницы Compare

## Цель

Сделать detail page поселка доступной по его названию, не превращая общий поиск сайта во второй интерфейс Compare.

## Объем работы

- Индексировать canonical settlement detail pages через manual scope.
- Отметить как `data-pagefind-body` только canonical name и видимые на странице альтернативные названия.
- Не добавлять скрытые транслитерации или aliases только ради поиска.
- Не индексировать тариф, расположение, инфраструктуру, пояснения, источники, карту и controls страницы поселка.
- Не индексировать Compare landing, rating, explorer controls, filter labels, технический JSON и 404 Compare.
- Не добавлять Compare description в searchable metadata; результат без полезного excerpt может показывать только section и title.

## Критерии приемки

- Поиск по canonical или видимому альтернативному названию возвращает canonical settlement URL.
- Запрос по тарифу, расположению или инфраструктурному факту не находит страницу только из-за данных Compare.
- Compare landing, rating, controls и остальные данные не попадают в общий индекс.

## Проверка

- Запустить production build.
- Проверить запросы по canonical и одному существующему видимому альтернативному названию.
- Проверить один тарифный или инфраструктурный запрос на отсутствие Compare-совпадения.
- Отдельный snapshot не нужен.

## Вероятные файлы

- `apps/www/src/pages/815/compare/settlements/[slug]/index.astro`

## Зависимости

- Задача 02.

## Вне задачи

- Compare landing, rating и поиск по сравнительным данным.
- Поиск и фильтрация внутри SettlementsExplorer.
- Изменение Compare data model или публичных JSON feeds.
