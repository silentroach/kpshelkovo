# Shelkovo Workspace

Монорепозиторий для сайтов и shared-пакетов Шелково.

## Состав

```text
apps/
  www/       # основное Astro-приложение kpshelkovo.online, включая /815/compare
  media/     # статическая 404 для media.kpshelkovo.online
packages/
  ui/        # shared styles / UI primitives
  url/
  format/
  geo/
docs/        # документация и дизайн-гайды
ops/         # nginx и deploy-конфиги
```

## Команды

```bash
# основной сайт на :4321 и media app на :4322
pnpm dev

# проверки
pnpm typecheck
pnpm test

# сборка
pnpm build
```

## Выходы сборки

- `dist/www` — основной сайт `kpshelkovo.online`
- `dist/media` — статическая 404 для `media.kpshelkovo.online`

## Деплой

- `kpshelkovo.online` получает содержимое `dist/www`
- `media.kpshelkovo.online` получает error app из `dist/media`, а остальные запросы проксирует в S3
- старый compare-домен обслуживается nginx-редиректами
- nginx-конфиги лежат в `ops/nginx/`
- GitHub Actions должен содержать repository secret `INDEXNOW_KEY`: стабильную строку из 8–128 латинских букв, цифр и дефисов, кроме зарезервированного имени `llms-full`. Deploy публикует её как корневой IndexNow key-файл и после синхронизации отправляет только новые канонические URL

## Где искать детали

- www-specific правила: `apps/www/AGENTS.md`
- дизайн-гайд и визуальные правила: `docs/design/design-code-shelkovo.md`
