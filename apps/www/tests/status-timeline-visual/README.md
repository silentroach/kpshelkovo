# Status Timeline Visual Fixture

Локальный fixture для retina screenshot tests компонента `StatusServiceTimeline`.

## Команды

```bash
pnpm --dir apps/www run test:visual:status
pnpm --dir apps/www run test:visual:status:update
```

Если Chromium еще не установлен локально:

```bash
pnpm --dir apps/www exec playwright install chromium
```

## Что здесь важно

- fixture живет вне production `src/pages`
- тесты запускают отдельный local-only Astro preview на `127.0.0.1:4324`
- время фиксируется и на SSR, и в браузере, чтобы screenshots не дрейфовали
- Проверяются 90 дневных ячеек сервиса и 30 ячеек сводки, соседние даты, выбор мышью и клавиатурой, все события выбранного дня и пассивная мобильная полоса.
- Playwright снимает отдельно полосу и открытый балун, чтобы снимок не обрезал подробности по границе fixture.
