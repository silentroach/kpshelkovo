# Задача 10: Подключить глобальные точки входа

## Цель

Сделать поиск легко доступным на главной, внутренних страницах и мобильных экранах без дублирования dialog instance.

## Объем работы

- Подключить один SearchDialog на уровне `BaseLayout`.
- Добавить trigger с иконкой и видимой подписью «Поиск» в desktop navigation.
- На mobile разместить trigger рядом с «Меню», а не внутри закрытого меню.
- Добавить тот же доступный trigger в hero navigation главной страницы.
- Связать несколько triggers с одним dialog и восстанавливать focus в фактически использованный trigger.
- Не показывать search trigger внутри самого индексируемого body и пометить UI `data-pagefind-ignore="all"` как дополнительную защиту.
- Проверить поведение с Astro client transitions и текущими dropdown/details navigation.

## Критерии приемки

- Поиск открывается с главной, desktop header и mobile header, при этом в DOM существует один dialog.
- Навигация не переполняется на целевых ширинах, а triggers имеют одинаковое доступное имя.
- Header menu, tariff dropdown, status indicator и client transitions продолжают работать.

## Проверка

- Выполнить ручную keyboard и responsive проверку точек входа.
- Запустить typecheck и существующие frontend tests.
- Не добавлять тест на точные позиции, gaps или CSS-классы navigation.

## Вероятные файлы

- `apps/www/src/layouts/BaseLayout.astro`
- `apps/www/src/components/site/SiteHeader.astro`
- `apps/www/src/components/site/SiteNav.astro`
- `apps/www/src/pages/index.astro`
- `apps/www/src/scripts/site-runtime.ts`

## Зависимости

- Задача 09.

## Вне задачи

- Перестройка общей информационной архитектуры navigation.
- Search query в URL.
