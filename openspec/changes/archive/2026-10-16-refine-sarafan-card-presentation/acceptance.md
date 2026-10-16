# Приёмка

## Результат

У нейтрального пересказа снята только постоянная серая подложка. Эмоджи, текст 14 px / 20 px, интервалы, источники, отрицательная подложка и положительный hover сохранены. Дизайн-гайд обновлён. Prettier также переформатировал существующую JSX-разметку без изменения её структуры.

## Проверки

- `pnpm --filter @shelkovo/www exec vitest run src/components/contacts/tests/ContactReviews.test.ts`: 3 теста прошли, включая нейтральную оценку, безопасный Markdown и исходный URL.
- `pnpm build`: успешная сборка обоих приложений и поискового индекса. Существующие предупреждения astro-compressor о deprecated `fileExtensions` не относятся к этой правке.
- `pnpm openspec:validate`: основные specs, текущий change и архивы прошли строгую проверку.
- Адресные Oxlint и Prettier для `ContactReviews.astro` прошли. Typecheck отдельно не запускался: исполняемый код и типы не изменены.

## Браузер

Проверена production-сборка из `dist/www` на локальном статическом сервере, без dev-стека. Восстановление исходного CSS во временном стиле позволяло сравнить фон и геометрию на тех же данных; сам стиль затем удалён. Шрифты загружены, CSS-переходы завершены перед измерениями.

- Александр, 1440×1000: высота блока 368.78125 px до и после.
- Александр, 390×844: высота блока 508.78125 px до и после.
- Александр, 320×844: высота блока 588.78125 px до и после.
- На всех ширинах нейтральный фон прозрачен в покое и при hover, размеры текста 14 px / 20 px, эмоджи 😐 и доступная подпись «Нейтральный» сохранены; горизонтального переполнения нет.
- HTML блока до и после временного восстановления исходного фона совпал. Размеры и интервалы сохранены.
- Положительный hover сохраняет `primary-soft-2`.
- Клавиатурный Tab / Shift+Tab даёт видимый охристый фокус нейтральной записи. Enter открыл исходный адрес `https://t.me/shelkovoecoclub/15262/55289`.
- На карточке «Бахи», 320 px, отрицательная запись сохраняет 👎 и красноватую подложку; переполнения нет.

Снимки: [Александр 1440](/openspec/changes/archive/2026-10-16-refine-sarafan-card-presentation/acceptance/alexander-1440.png), [390](/openspec/changes/archive/2026-10-16-refine-sarafan-card-presentation/acceptance/alexander-390.png), [320](/openspec/changes/archive/2026-10-16-refine-sarafan-card-presentation/acceptance/alexander-320.png), [фокус](/openspec/changes/archive/2026-10-16-refine-sarafan-card-presentation/acceptance/neutral-focus-390.png), [отрицательная запись](/openspec/changes/archive/2026-10-16-refine-sarafan-card-presentation/acceptance/negative-320.png). Полные измерения находятся в [JSON](/openspec/changes/archive/2026-10-16-refine-sarafan-card-presentation/acceptance/measurements.json).

Отдельная production-приёмка не нужна. Человеческое ревью и merge остаются владельцу.

## Ревью

Независимый reviewer проверил полный diff от `e1452ba80401ebd7666e0504d51e38560793f26c`, включая коммит плана, незакоммиченные правки и новые материалы приёмки. Подтверждённых проблем и предложений упрощения нет. Тесты и браузер выполнял автор; reviewer сверил их результаты с кодом. После sync/archive требуется адресный повтор.
