# Задача 11: Настроить production-доставку Pagefind

## Цель

Безопасно отдавать runtime и шардированный индекс Pagefind через текущий nginx и deploy pipeline.

## Объем работы

- Проверить фактические имена стабильных entrypoints, WebAssembly, metadata, hashed index chunks и fragments.
- Добавить узкую cache policy: долгий immutable cache только для content-hashed файлов, revalidation или короткий TTL для стабильных entrypoints и WASM.
- Сохранить обязательные security headers во всех новых nginx locations.
- Проверить custom Pagefind extensions вместе с `X-Content-Type-Options: nosniff`.
- Не добавлять внешние origins и не расширять `connect-src`.
- Обновить `ops/nginx/CSP.md`: Pagefind использует WebAssembly compilation, уже фактически разрешенную текущим `unsafe-eval`, и существующий `worker-src 'self' blob:`.
- Добавить production smoke к существующему deploy flow или его проверкам без отдельного поискового сервиса.

Перед изменением nginx загрузить `nginx-expert` и прочитать локальные инструкции `ops/nginx/AGENTS.md`.

## Критерии приемки

- Production-like nginx возвращает entrypoint, worker, WASM, metadata, index chunk и fragment с `200` и базовыми security headers.
- Стабильные и hashed assets получают разные подходящие cache policies без version mismatch после deploy.
- Browser console не показывает CSP, worker, MIME или WebAssembly errors.

## Проверка

- Проверить nginx config через `nginx -t` в deploy-окружении перед reload.
- Выполнить один browser smoke с Network и Console.
- Не создавать тесты на каждое имя generated chunk.

## Вероятные файлы

- `ops/nginx/kpshelkovo-online.conf`
- `ops/nginx/CSP.md`
- `.github/workflows/ci.yml`
- существующие deploy/nginx contract tests, если подходящий test layer уже есть

## Зависимости

- Задачи 01 и 10.

## Вне задачи

- Новый upstream или systemd service.
- Серверная обработка поисковых запросов.
