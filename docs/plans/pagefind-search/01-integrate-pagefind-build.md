# Задача 01: Подключить Pagefind к build и dev snapshot

## Цель

Сделать Pagefind воспроизводимой частью production build и дать разработчику явную команду подготовки локального snapshot без второго runtime-сервиса.

## Контекст

Сейчас `apps/www` выполняет `astro build`, затем копирует `apps/www/dist/site` в корневой `dist/www`. Pagefind должен запускаться между этими шагами и писать индекс внутрь `dist/site/pagefind`.

Обычный `pnpm dev` не должен автоматически запускать Pagefind или предварительный Astro build. Полный локальный поиск включается последовательностью `pnpm search:prepare` и `pnpm dev`.

## Объем работы

- Добавить закрепленную Pagefind dependency в `apps/www`.
- Добавить минимальную конфигурацию Pagefind рядом с приложением.
- Встроить Pagefind после `astro build` и до копирования `dist/site`.
- Оставить обычный `pnpm dev` быстрым и независимым от индекса.
- Добавить корневую команду `pnpm search:prepare`, которая делает актуальный Astro build и пишет Pagefind в отдельный игнорируемый dev-кеш.
- Хранить dev snapshot в явном корневом кеше `.cache/pagefind`; `pnpm search:prepare` полностью заменяет этот каталог.
- Через dev-only Vite middleware отдавать подготовленный кеш по `/pagefind/`, не копируя generated files в `public`.
- Передать клиенту при старте dev явный признак доступности snapshot, чтобы отсутствие кеша не создавало ожидаемый 404.
- Сохранить `pnpm build && pnpm preview` как финальный production-like сценарий.

На этом шаге допустим временный широкий индекс до появления opt-in marker в задаче 02. Не выпускать результат задачи 01 отдельно в production.

## Критерии приемки

- `pnpm --filter @shelkovo/www build` создает `dist/site/pagefind` и корневой `dist/www/pagefind`.
- Ошибка Pagefind завершает build с ненулевым кодом.
- После `pnpm search:prepare` обычный `pnpm dev` отдает подготовленный `/pagefind/`; без подготовки dev запускается без индекса и без автоматического build.

## Проверка

- Запустить `pnpm --filter @shelkovo/www build`.
- Проверить наличие entrypoint, worker, metadata, хотя бы одного index chunk и fragment.
- Запустить `pnpm search:prepare`, затем `pnpm dev` и проверить доступность dev snapshot; после проверки остановить server.
- Не добавлять отдельный unit test для shell-команды.

## Вероятные файлы

- `package.json`
- `apps/www/package.json`
- `apps/www/pagefind.yml`
- `apps/www/astro.config.ts`
- `.gitignore`
- `pnpm-lock.yaml`

## Зависимости

Нет.

## Вне задачи

- HTML-разметка корпуса.
- Клиентский UI.
- Nginx cache policy.
