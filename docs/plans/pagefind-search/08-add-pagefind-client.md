# Задача 08: Добавить headless-клиент Pagefind

## Цель

Скрыть динамический импорт и внешний результат Pagefind за маленьким внутренним клиентом, удобным для UI и focused testing.

## Объем работы

- Описать readonly внутренний result DTO отдельно от кода.
- Лениво импортировать `/pagefind/pagefind.js` только при первой попытке поиска в production/preview.
- Настроить ranking metadata так, чтобы section/date не повышали результат.
- Нормализовать URL, title, section, date, excerpt и optional sub-result anchor.
- Использовать Pagefind debounce/preload или эквивалентную отмену устаревших запросов без нескольких конкурирующих механизмов.
- Ограничить длину запроса на уровне UX.
- В dev использовать тот же `/pagefind/`, если при старте доступен подготовленный `pnpm search:prepare` snapshot.
- В dev без подготовленного snapshot не выполнять сетевой import, а возвращать явное состояние `devUnavailable` с подсказкой по команде подготовки.
- Предусмотреть маленький fake adapter только для component test и разработки состояний компонента.

## Критерии приемки

- Первый import Pagefind происходит только после пользовательского открытия/ввода, повторные запросы переиспользуют instance.
- Клиент возвращает стабильный внутренний DTO и не отдает UI наружную структуру Pagefind.
- Устаревший медленный ответ не заменяет более новый результат; подготовленный dev snapshot работает через production URL, а его отсутствие не создает 404 на `/pagefind/`.

## Проверка

- Добавить один focused unit test на нормализацию и stale response behavior.
- Запустить typecheck.
- Не мокать весь Pagefind runtime и не тестировать его собственный ranking.

## Вероятные файлы

- `apps/www/src/lib/search/client.ts`
- `apps/www/src/lib/search/client.types.ts`
- `apps/www/src/lib/search/tests/client.test.ts`
- `apps/www/src/env.d.ts`

## Зависимости

- Задача 01.

## Вне задачи

- Видимый dialog UI.
- Search analytics и query persistence.
