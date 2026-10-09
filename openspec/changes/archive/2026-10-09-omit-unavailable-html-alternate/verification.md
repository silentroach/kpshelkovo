# Production-приёмка #942

- Реализация вошла в основную ветку через [PR #1020](https://github.com/silentroach/kpshelkovo/pull/1020). Merge выполнил внешний процесс, не агент этой сессии.
- Подтверждённый успешный CI/CD: [run 37962731795](https://github.com/silentroach/kpshelkovo/actions/runs/37962731795), SHA `ce37a6d6e4667fa75df2bf76927b3258b28c4144`, завершение 9 октября 2026 года в 16:58:42 UTC.
- Проверка production выполнена 9 октября 2026 года в 17:08:28–17:08:31 UTC: 30 реальных GET/HEAD-запросов, все успешны. На момент проверки указанный run оставался последним успешным master CI/CD. SHA взят из GitHub, HTTP-сервер идентификатор сборки не объявлял.

## Результаты

- `/meetings/` с Markdown Accept — 200 без HTML alternate; обычный HTML-запрос — 404.
- `/meetings/index.md` — 200 без обязательного обратного alternate.
- `/meetings/2026-02-21-ok/` — HTML и negotiated Markdown доступны, взаимные alternate сохранены. Прямой Markdown встречи доступен.
- `/status/history/` — обе версии доступны; общий Markdown `/status/index.md` и обратная ссылка на исходный HTML URI сохранены.
- Query-параметры сохраняются в HTML alternate существующих пар.
- gzip и Brotli работают, `Vary` сохраняет Accept и Accept-Encoding.
- MIME, describedby, robots, политика кеширования и security headers соответствуют локальной приёмке. HEAD не возвращает тело; декомпрессированные direct/negotiated Markdown совпадают.

## Материалы

- Временное локальное свидетельство: `/private/var/folders/sb/82f4cg9n6z182c5q0k6dn3hr0000gn/T/opencode/issue-942-production-empqk71z/http-results.json`. Файл не опубликован и может исчезнуть при очистке каталога; это не постоянная ссылка для читателей архива. Результаты приёмки зафиксированы выше.
- Production-проверка не меняла файлы сайта, конфигурацию или состояние сервера. Завершающий PR переносит delta в основной spec и архивирует change; новых runtime-правок нет.
