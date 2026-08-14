# Задача 09: Собрать доступный поисковый диалог

## Цель

Создать минималистичный search UI в визуальной системе сайта поверх headless-клиента Pagefind.

## Объем работы

- Использовать нативный `<dialog>` и Svelte 5 для состояния интерфейса.
- Сделать desktop raised surface около `46rem` и полноэкранный mobile layout.
- Реализовать состояния до ввода, загрузки, результатов, пустой выдачи, ошибки и dev-unavailable.
- Показать section, optional date, title и excerpt плоскими строками с разделителями.
- Показывать первые восемь результатов и автоматически подгружать следующие при прокрутке.
- Реализовать focus on open, focus restoration, `Escape`, arrows, `Enter`, normal tab order и `aria-live`.
- Закрывать dialog перед Astro page swap.
- Использовать существующие tokens, PT Serif/Fira Sans и текущие focus styles; не подключать CSS Pagefind UI.

Видимые тексты должны быть короткими и живыми. Перед реализацией загрузить `copy-editing`, `web-typography`, `frontend-ui-engineering`, `tailwind-design-system` и обязательные Svelte tools.

## Критерии приемки

- Диалог полностью управляется клавиатурой, корректно возвращает focus и не блокирует страницу после закрытия.
- Все состояния понятны без цвета, а длинные русские titles/excerpts не ломают 320 px и 200% zoom.
- Обычная страница до открытия dialog не загружает Pagefind runtime или index chunks.

## Проверка

- Добавить один focused component test с fake adapter на focus/close и основные state transitions.
- Вручную проверить 320, 768, 1024 и 1440 px.
- Не делать visual snapshots и не проверять Tailwind-классы.

## Вероятные файлы

- `apps/www/src/components/search/SearchDialog.svelte`
- `apps/www/src/components/search/search-dialog.types.ts`
- `apps/www/src/components/search/tests/SearchDialog.test.ts`
- `apps/www/src/styles/site.css`

## Зависимости

- Задача 08.

## Вне задачи

- Точки входа в header/home navigation.
- Видимые section filters.
- Отдельная страница результатов.
