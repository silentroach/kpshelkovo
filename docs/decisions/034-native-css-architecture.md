# ADR-034: Нативная CSS-архитектура после Tailwind

## Статус

Принят; исключение для явно подключаемого feature-owned CSS — [ADR-042](/docs/decisions/042-feature-owned-map-frame-css.md).

## Дата

2026-08-31

## Контекст

Глобальный stylesheet в `packages/ui` объединял Tailwind, тему, reset, site-level primitives и оформление generated content, хотя его единственным production-потребителем был `apps/www`. Такая граница заставляла UI-пакет владеть каскадом приложения и связывала дизайн-токены с именами utilities.

Отказ от Tailwind выполнен в [#460](https://github.com/silentroach/kpshelkovo/issues/460) / [PR #628](https://github.com/silentroach/kpshelkovo/pull/628). Решение сохраняет границы владения нативным CSS после миграции.

## Решение

### Владение CSS

- `apps/www` владеет глобальной темой и типографическими ролями, минимальным reset, defaults документа, site-level `ui-*`, оформлением generated content и межкомпонентными/runtime-интеграциями. `ui-*` — стабильный CSS API сайта, а не публичный API `@shelkovo/ui`.
- Astro- и Svelte-компоненты владеют локальным оформлением через scoped `<style>`; CSS Modules не нужны. Package-компоненты документируют минимальные inherited semantic properties и не требуют глобального stylesheet сайта. Полную fallback-палитру в них не копируют; fallback допустим для standalone-компонентов и брендовых иконок. Визуальные стенды пакета задают host theme сами.
- `packages/markdown` выдаёт стабильные semantic hooks; приложение оформляет их правилами, ограниченными корнем generated content.
- `apps/media` имеет минимальный standalone foundation и не импортирует глобальные стили `apps/www`: независимой странице ошибки не нужна тема и каскад всего сайта.

### Каскад

[global.css](/apps/www/src/styles/global.css) один раз задаёт порядок слоёв: `tokens, reset, base, primitives, content, integration`. Они отвечают соответственно за semantic properties, нормализацию браузерных defaults, defaults документа, общие `ui-*`, generated content и интеграции приложения.

Scoped CSS остаётся unlayered и сильнее layered foundation. Отдельного глобального `overrides` нет. Правила для DOM, созданного runtime или сторонней библиотекой вне framework scoping, остаются у владельца feature, входят в подходящий слой и ограничиваются стабильным root class или `data-*` hook. Глобальная основа не служит складом route-specific правил. Узкое unlayered исключение с явным импортом и собственными opt-in классами определено в [ADR-042](/docs/decisions/042-feature-owned-map-frame-css.md).

### Design tokens

- [tokens.css](/apps/www/src/styles/tokens.css) в слое `tokens` — единственный источник runtime-значений и актуальных имён общесайтовых токенов. [Дизайн-гайд](/docs/design/design-code-shelkovo.md) описывает их семантику, применение и визуальные ограничения; при изменении значений его обновляют синхронно. Он не генерирует CSS.
- Scoped CSS читает канонические custom properties напрямую; контекстная поверхность переопределяет их только на явно названной theme boundary. Feature-local и runtime protocol properties остаются у владельцев компонентов или primitives. Общая spacing scale не вводится.
- Runtime-код передаёт цвета внешнему SDK из `getComputedStyle()` на feature root и явно сообщает об отсутствии обязательного значения. Параллельная JavaScript-палитра и общий TypeScript API токенов не создаются. Browser chrome metadata принадлежит отдельному app-owned SSR-модулю.
- Поддерживается светлая тема. Тёмная тема требует отдельного решения; миграционные Tailwind aliases не являются compatibility API.

## Почему так

Package-owned global stylesheet закрепил бы случайную границу вместо реального переиспользования. Нативный scoped CSS уже решает локализацию в Astro и Svelte, поэтому CSS Modules добавили бы второй механизм без нужной возможности. Собственные utilities воспроизвели бы косвенное оформление и глобальный API Tailwind; общие recipes остаются семантическими.

Явный порядок слоёв отделяет reset, базовые правила, primitives и generated content. Полностью unlayered глобальные стили лишили бы компоненты предсказуемого приоритета; узкие исключения требуют явного владельца и подключения.

## Источники

- [Выбор слоёв CSS-архитектуры](https://github.com/silentroach/kpshelkovo/issues/461#issuecomment-5471097855).
- [Контракт токенов без @theme](https://github.com/silentroach/kpshelkovo/issues/465#issuecomment-5471222311).
- [Исторический baseline Tailwind перед миграцией](/docs/tailwind-migration-baseline-2026-08-31.md).
