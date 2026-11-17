# Адаптивный блок KB

Небольшой Markdown-пример с короткой и длинной записью, собственными номерами и ручным мобильным списком. Fixture использует настоящий app-renderer, foundation, шрифты и стили таблиц KB; копии CSS в тесте нет.

- Проверка: `pnpm --filter @shelkovo/www test:visual:kb-adaptive`.
- Обновление эталонов: `pnpm --filter @shelkovo/www test:visual:kb-adaptive:update`.
- Ширины: 320, 390, 639, 640, 768 и 1440 px. Пара 639/640 проверяет границу переключения; JavaScript выключен.
- Снимки хранятся рядом с `kb-adaptive.visual.local.spec.ts` в каталоге snapshots.
