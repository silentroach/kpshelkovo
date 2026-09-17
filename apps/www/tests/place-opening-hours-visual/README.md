# Place Opening Hours Visual Fixture

Локальные screenshot-тесты `PlaceOpeningHours.astro` по схеме `NewsEventCard`.

## Команды

Из корня workspace:

```bash
pnpm --dir apps/www run test:visual:place-opening-hours
pnpm --dir apps/www run test:visual:place-opening-hours:update
```

Если Chromium ещё не установлен:

```bash
pnpm --dir apps/www exec playwright install chromium
```

## Покрытие

- Пять вариантов на desktop (1440 × 1100) и mobile (390 × 900), всего 10 PNG.
- `daily`: ежедневные часы КПП Вилладжа.
- `middle-day-off`: часы Буржуйки с выходным во вторник.
- `differing-weekend-hours`: часы Green Dreams с отдельными пятницей–субботой и воскресеньем.
- `split-intervals-description`: два интервала, выходные и пояснение «Вход со двора.» из примера в design.
- `no-hours`: wrapper с соседним адресом; часы и статус отсутствуют.

Fixture импортирует production-компонент, `global.css` через общий
`visual-foundation.css` и `site.css`. Контейнер повторяет ширину и отступы
сведений о месте. Расписания зафиксированы в доменном формате, чтобы редакционные
изменения не меняли тестовые сценарии.

Общие Astro/Playwright helpers и launcher собирают fixture вне production routes
и запускают preview на `127.0.0.1:4335`. Снимки охватывают только выбранный `dl`.
Как остальные visual suites, тесты запускаются локально; PNG зависят от платформы.
После обновления нужно просмотреть эталоны и отдельно выполнить команду сравнения.

До `goto` фиксируется `2026-09-15T10:30:00Z`: вторник, 13:30 в Москве.
Часовой пояс браузера — `America/Los_Angeles`. Ежедневный график и Green Dreams
открыты; Буржуйка закрыта в выходной, пример с двумя интервалами закрыт на перерыв.
Тест проверяет статус и отсутствие горизонтального переполнения страницы.

Ещё два теста открывают тот же fixture с отключённым JavaScript на обоих экранах:
вся неделя остаётся видимой, статус скрыт, оба интервала доступны, пояснение
расположено под расписанием, блок не переполняет контейнер. PNG для этого режима
не добавляются.
