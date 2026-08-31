# ADR-034: Нативная CSS-архитектура после Tailwind

## Статус

Принят

## Дата

2026-08-31

## Контекст

`packages/ui/styles.css` одновременно импортирует Tailwind, объявляет design tokens, дополняет Preflight, публикует semantic `ui-*` primitives и стилизует generated content. Его единственный production-потребитель - `apps/www`, тогда как package-компоненты используют лишь небольшую часть глобальных hooks и Tailwind utilities.

Такое владение не отражает реальную границу переиспользования. Оно заставляет `packages/ui` поставлять глобальную тему и каскад приложения, затрудняет scoped styling компонентов и связывает design tokens с именами Tailwind utilities.

Нужна целевая архитектура для постепенного полного отказа от Tailwind. Промежуточные состояния должны оставаться рабочими, но не должны превращать native CSS в собственный utility-фреймворк.

## Решение

### Владение CSS

`apps/www` владеет глобальной дизайн-системой сайта:

- шрифтами и semantic design tokens;
- минимальным reset и defaults элементов документа;
- stable site-level `ui-*` primitives;
- стилями Markdown и другого generated content;
- межкомпонентными и runtime-интеграциями приложения.

`ui-*` остается стабильным CSS API сайта, но не является публичным API пакета `@shelkovo/ui`.

Astro- и Svelte-компоненты владеют локальным оформлением через scoped `<style>`. CSS Modules не вводятся. Scoped CSS остается unlayered и предсказуемо сильнее глобальных recipes.

`packages/ui` в целевом состоянии не экспортирует обязательный global stylesheet. Каждый визуальный package-компонент владеет scoped CSS и документирует минимальный набор inherited semantic custom properties. Полные fallback-палитры не копируются в компоненты; fallback сохраняют только standalone-компоненты и брендовые иконки.

`packages/markdown` продолжает выдавать стабильные semantic hooks. `apps/www` стилизует их глобально, но ограничивает правила корнем generated content.

`apps/media` сохраняет собственный минимальный standalone foundation и не импортирует глобальные стили `apps/www`.

### Каскад

`apps/www` объявляет master order один раз:

```css
@layer tokens, reset, base, primitives, content, integration;
```

Слои имеют фиксированную ответственность:

- `tokens` - semantic custom properties;
- `reset` - минимальная нормализация browser defaults;
- `base` - defaults элементов документа;
- `primitives` - reusable `ui-*` recipes;
- `content` - Markdown и другой generated HTML;
- `integration` - межкомпонентные и runtime-контракты приложения.

Отдельного глобального слоя `overrides` нет. Если DOM создает runtime-код или сторонняя библиотека и framework scoping до него не доходит, правило остается рядом с владельцем feature, входит в подходящий global layer и ограничивается стабильным root class или `data-*` hook. Общий `site.css` не используется как склад route-specific правил.

### Design tokens

Обычный app-owned `tokens.css` внутри слоя `tokens` является физическим source of truth. `docs/design/design-code-shelkovo.md` описывает семантику и значения tokens, а точный финальный inventory закреплен ниже. Design guide обновляется синхронно с runtime CSS, но не генерирует его.

Финальный словарь сохраняет semantic names:

- основа: `--color-bg`, `--color-bg-soft`, `--color-surface`, `--color-surface-raised`, `--color-surface-muted`, `--color-border`, `--color-border-strong`, `--color-text`, `--color-text-muted`, `--color-text-soft`;
- действия и фокус: `--color-primary`, `--color-primary-hover`, `--color-primary-soft`, `--color-primary-soft-2`, `--color-accent`, `--color-accent-hover`, `--color-accent-soft`, `--color-accent-text`, `--color-earth`, `--color-focus`;
- эффекты: `--color-shadow`, `--shadow-1`, `--shadow-2`;
- состояния: `--color-success`, `--color-success-foreground`, `--color-success-soft`, `--color-success-border`, `--color-success-text`, `--color-warning`, `--color-warning-graphic`, `--color-warning-soft`, `--color-warning-border`, `--color-warning-text`, `--color-danger`, `--color-danger-foreground`, `--color-danger-soft`, `--color-danger-border`, `--color-danger-text`, `--color-info-soft`, `--color-info-border`, `--color-info-text`, `--color-water`, `--color-water-soft`, `--color-water-border`, `--color-unknown`, `--color-unknown-soft`, `--color-unknown-border`, `--color-neutral-soft`, `--color-neutral-border`;
- брендовые цвета: `--color-telegram`, `--color-whatsapp`, `--color-domyland-start`, `--color-domyland-end`, `--color-yandex-maps`, `--color-yandex-maps-light`, `--color-star`;
- типографика: `--font-heading`, `--font-body`;
- геометрия: `--radius-sm`, `--radius-md`, `--radius-lg`, `--radius-xl`, `--radius-full`, а также app-only `--page-max` и `--page-padding`.

Первый перенос задает `--radius-sm: 0.25rem`, `--radius-md: 0.375rem`, `--radius-lg: 0.5rem` и `--radius-xl: 0.75rem` по migration baseline. `--radius-full: 999px` сохраняет pill-геометрию и считается визуально эквивалентной текущему Tailwind rule `2147483647px`. Иные значения требуют явного решения о визуальном изменении.

Общая spacing scale не вводится.

Tailwind-oriented aliases `background`, `foreground`, `muted`, `muted-foreground`, `ring`, `secondary`, `card`, `card-foreground`, `elevated`, `primary-tint` и `container` не входят в финальный контракт. Старые aliases допустимы только как замороженный migration bridge: новые стили их не используют, а каждый alias удаляется после исчезновения его consumers.

Неиспользуемые `--color-info`, `--color-info-foreground`, `--color-warning-foreground`, `--color-overlay` и глобальные `--hero-*` также не входят в финальный контракт. Старые `--color-muted-soft` и `--color-muted-border-soft` разделяются между `neutral-*` и `unknown-*` по смыслу.

Feature-local и runtime protocol properties, включая `--segment-*`, `--news-*`, `--place-*`, `--ui-sticky-table-*` и `--ui-map-marker-*`, остаются у владельцев компонентов или primitives.

Темная тема не является продуктовым контрактом этой миграции. `.dark` overrides удаляются, а будущая темная тема потребует отдельного решения.

### Потребление tokens

Scoped Astro- и Svelte-CSS читает канонические custom properties напрямую. Контекстная поверхность может переопределить их только на явно названной theme boundary.

Runtime-код, передающий цвет внешнему SDK, читает обязательный token через `getComputedStyle()` с feature root и явно сообщает об отсутствии значения. Параллельная JavaScript-палитра не создается.

Browser chrome metadata переезжает из `@shelkovo/ui/theme` в отдельный app-owned SSR-модуль. Dark metadata удаляется вместе с неподдерживаемой темной темой. CSS custom properties не становятся общим TypeScript token API.

## Рассмотренные альтернативы

### Сохранить package-owned global stylesheet

Отклонено: stylesheet имеет одного production-потребителя, а глобальные tokens, reset и content styles принадлежат приложению. Package API закрепил бы случайную текущую границу.

### Построить собственный набор utilities

Отклонено: это заменило бы Tailwind домашним аналогом с теми же проблемами indirect styling и глобального candidate API. Shared recipes остаются семантическими, а локальное оформление переходит в scoped CSS.

### Использовать CSS Modules

Отклонено: Astro и Svelte уже дают штатный scoped CSS. Второй механизм локализации не добавляет необходимой возможности, но усложняет навигацию и conventions.

### Оставить весь custom CSS unlayered

Отклонено для глобальных стилей: явный master order нужен для безопасного сосуществования reset, base, primitives и generated content. Unlayered остается только component-scoped CSS, которому нужна предсказуемо более высокая сила.

## Последствия

- Миграция не сводится к переносу `packages/ui/styles.css`: package-компоненты нужно освободить от `ui-*` и utility-зависимостей по отдельности.
- Добавление layers к существующему CSS требует отдельного плана сосуществования, потому что текущие unlayered rules сильнее Tailwind utilities.
- Точный replacement Preflight и гарантии визуального паритета принимаются отдельными решениями.
- Visual fixtures `packages/ui` должны объявлять host theme сами.
- Старые aliases и Tailwind-generated token names считаются временным migration debt, а не compatibility API.
- Новые стили пишутся без Tailwind, но это решение само по себе не вводит правило «тронул файл - мигрируй целиком».

## Источники

- [«Выбрать слои целевой CSS-архитектуры»](https://github.com/silentroach/kpshelkovo/issues/461#issuecomment-5471097855).
- [«Определить контракт токенов без @theme»](https://github.com/silentroach/kpshelkovo/issues/465#issuecomment-5471222311).
- [Baseline Tailwind-контура перед миграцией](../tailwind-migration-baseline-2026-08-31.md).
