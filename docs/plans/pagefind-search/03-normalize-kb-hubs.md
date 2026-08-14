# Задача 03: Нормализовать структуру KB-хабов

## Цель

Сделать имя source-файла явным признаком роли KB page: `index.md` для hub, обычный `<slug>.md` для конечной статьи.

## Контекст

KB loader уже строит одинаковый public route из `foo.md` и `foo/index.md`. Поэтому текущие hub pages можно переместить без изменения URL, canonical или пользовательских ссылок.

Конвенция:

- `foo/index.md` публикует hub `/kb/foo/`;
- `foo/bar.md` публикует конечную статью `/kb/foo/bar/`;
- папка может содержать дочерние материалы без собственного hub-файла;
- `index.md` может временно не иметь детей, но все равно остается hub и не входит в поиск.

## Объем работы

- Найти KB pages, которые имеют дочерние public routes, но хранятся как обычный `.md`.
- Переместить текущие хабы, включая `communication.md` и `services/internet.md`, в одноименные папки как `index.md`.
- Сохранить frontmatter и body без редакционных изменений.
- Обновить source-id references и fixtures, если они существуют; публичные URLs не менять.
- Добавить build-инвариант: KB page с дочерними routes обязана иметь source id, заканчивающийся на `/index`.
- Не требовать hub-файл для каждой директории с материалами.

## Критерии приемки

- Все текущие KB pages с дочерними public routes хранятся как `index.md` в собственной папке.
- Public URLs, canonical URLs и Markdown-ссылки после перемещения не меняются.
- Новая страница с потомками и обычным `.md` получает понятную build-ошибку.

## Проверка

- Добавить один focused test существующего KB loader/invariant на неправильный hub source id.
- Запустить KB tests, typecheck и production build.
- Не делать snapshots всех KB routes или содержимого статей.

## Вероятные файлы

- `apps/www/src/data/kb/communication.md` -> `apps/www/src/data/kb/communication/index.md`
- `apps/www/src/data/kb/services/internet.md` -> `apps/www/src/data/kb/services/internet/index.md`
- `apps/www/src/lib/kb/load.ts`
- `apps/www/src/lib/kb/load.test.ts`
- другие source-id fixtures только при фактических ссылках

## Зависимости

- Задача 02 только организационно; технически миграцию можно выполнить независимо.

## Вне задачи

- Изменение видимого текста KB.
- Обязательное создание hub page для каждой папки.
- Поисковая разметка KB leaf pages.
