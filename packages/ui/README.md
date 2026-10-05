# `@shelkovo/ui`

Компоненты пакета владеют своим scoped CSS. Host-приложение передает им только используемые semantic custom properties:

- `Breadcrumbs.astro`: `--color-primary`, `--color-primary-hover`, `--color-text`, `--color-text-muted`;
- `LinkWithIcon.astro`: `--color-primary`, `--color-primary-hover`, `--color-telegram`;
- `NotFoundView.astro`: `--font-body`, `--font-heading`; без этих ролей использует системные generic fallback `system-ui` и `serif`;
- `SiteFooter.astro`: `--color-border`, `--color-primary-hover`, `--color-text`, `--color-text-muted`, `--font-body`, `--page-max`, `--page-padding`;
- `StarRating.astro`: `--color-border-strong`, `--color-star`.

`NotFoundView.astro` остаётся standalone-компонентом со своей палитрой и scoped CSS, но не подключает шрифты самостоятельно. Брендовые SVG-иконки содержат fallback-цвета для standalone-использования.

## Шрифты хоста

- Build-time модуль `@shelkovo/ui/fonts` экспортирует `wwwFonts`, `mediaFonts` и `fontPreloads`. Хост передаёт соответствующий набор в `fonts` Astro config. Импорт модуля не подключает CSS и не запускает клиентский код.
- `@shelkovo/ui/Fonts.astro` подключается в `<head>` и выводит штатные `<Font>` Astro. Основной сайт использует `<Fonts preload />`: только Cyrillic Fira Sans 400/600 и PT Serif 700. Media 404 использует `<Fonts media />`, визуальные стенды — `<Fonts />`, оба без preload. Компонент проверяет полноту разрешённого набора: флаг `media` выбирает минимальный набор для этой проверки.
- `wwwFonts` задаёт Fira Sans 400/600 и PT Serif 700, subsets `latin`, `cyrillic`, `latin-ext`; `mediaFonts` — только Fira Sans 600 и PT Serif 700, subset `cyrillic`. Формат — WOFF2, стиль — normal, `display: 'swap'`, `optimizedFallbacks: true`. Завершающие fallback — `system-ui` для Fira Sans и `Georgia, serif` для PT Serif.
- Astro генерирует `--font-fira-sans` и `--font-pt-serif` вместе с метрически подобранными локальными fallback. Хост задаёт semantic roles: `--font-body: var(--font-fira-sans, system-ui)` и `--font-heading: var(--font-pt-serif, Georgia, serif)`. Компоненты читают роли, а не хешированные имена шрифтов.
- `@shelkovo/ui/standalone-error.css` — минимальный reset и отображение этих двух ролей для самостоятельной media 404. Он не содержит `@font-face`: для шрифтов нужны и `mediaFonts` в конфигурации, и `<Fonts media />` в head. Подключение не требует клиентского runtime.

Бюджет загрузки — в [дизайн-гайде](/docs/design/design-code-shelkovo.md#font-budget), источник и кеш сборки — в [документации разработки](/docs/development.md#шрифты-при-сборке).
