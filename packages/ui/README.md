# `@shelkovo/ui`

Компоненты пакета владеют своим scoped CSS. Host-приложение передает им только используемые semantic custom properties:

- `Breadcrumbs.astro`: `--color-primary`, `--color-primary-hover`, `--color-text`, `--color-text-muted`;
- `LinkWithIcon.astro`: `--color-primary`, `--color-primary-hover`, `--color-telegram`;
- `NotFoundView.astro`: `--font-body`, `--font-heading`; без этих ролей использует системные generic fallback `system-ui` и `serif`;
- `SiteFooter.astro`: `--color-border`, `--color-primary-hover`, `--color-text`, `--color-text-muted`, `--font-body`, `--page-max`, `--page-padding`;
- `StarRating.astro`: `--color-border-strong`, `--color-star`.

`Breadcrumbs.astro` сохраняет один SSR-список и полную microdata. До `64rem` показывает только родителей между главной и текущей страницей; пустой путь скрывает вместе с `nav`. До `40rem` родители размещаются вертикально, от `40rem` до `64rem` — горизонтально с естественным переносом, от `64rem` видна полная цепочка. Стабильный класс корневого элемента — `breadcrumbs`, пустого сокращённого пути — `breadcrumbs--desktop-only`. Хост отвечает за мобильный фон, полноширинную геометрию и отсутствие пустых внешних обёрток до `64rem`; `--color-breadcrumb-surface` принадлежит оформлению хоста и не читается компонентом. Мобильные ссылки используют `--color-text-muted`, при наведении и видимом фокусе — `--color-primary`; средний режим сохраняет цвета и оформление горизонтального вида, включая светлые ссылки над обложкой новости.

Если ниже `40rem` после сокращения пути виден ровно один элемент и это ссылка на родителя, `Breadcrumbs.astro` показывает перед названием декоративный `‹` с `aria-hidden="true"`. Знак не меняет доступное имя и исходный URL ссылки; работает без JavaScript. Для единственной нессылочной подписи, ссылки вместе с видимой подписью и нескольких родителей начального знака нет. От `40rem` знак скрыт. `linkLast` не меняет сокращение: последний элемент до `64rem` скрыт и в подсчёте родителей не участвует. Длинный текст переносится под началом названия, знак остаётся у первой строки; полная microdata сохраняется.

`NotFoundView.astro` остаётся standalone-компонентом со своей палитрой и scoped CSS, но не подключает шрифты самостоятельно. Брендовые SVG-иконки содержат fallback-цвета для standalone-использования.

## Шрифты хоста

- Build-time модуль `@shelkovo/ui/fonts` экспортирует `wwwFonts` и `mediaFonts`. Хост передаёт соответствующий набор в `fonts` Astro config. Импорт модуля не подключает CSS и не запускает клиентский код.
- Источник — WOFF2 и Unicode-диапазоны из закреплённых npm-пакетов `@fontsource/fira-sans` и `@fontsource/pt-serif`, подключённых через штатный `fontProviders.local()`. Пути разрешаются относительно UI-пакета; после установки зависимостей шрифтовой части сборки не нужен доступ к внешнему API/CDN или тёплый Astro cache.
- `@shelkovo/ui/Fonts.astro` подключается в `<head>` и выводит штатные `<Font preload={false}>` Astro. Основной сайт и визуальные стенды используют `<Fonts />`, media 404 — `<Fonts media />`. Все хосты работают без font preload: файлы загружаются по потребности текста. Компонент проверяет полноту разрешённого набора: флаг `media` выбирает минимальный набор для этой проверки.
- `wwwFonts` задаёт Fira Sans 400/600 и PT Serif 700, subsets `latin`, `cyrillic`, `latin-ext`; `mediaFonts` — только Fira Sans 600 и PT Serif 700, subset `cyrillic`. Формат — WOFF2, стиль — normal, `display: 'swap'`. У www и стендов `optimizedFallbacks: true`, у media — `false`: коррекция метрик меняла ширину пробелов вне её Cyrillic-набора. Завершающие fallback — `system-ui` для Fira Sans и `Georgia, serif` для PT Serif.
- Astro генерирует `--font-fira-sans` и `--font-pt-serif`, для www и стендов — вместе с метрически подобранными локальными fallback. Media использует системные fallback без коррекции метрик. Хост задаёт semantic roles: `--font-body: var(--font-fira-sans, system-ui)` и `--font-heading: var(--font-pt-serif, Georgia, serif)`. Компоненты читают роли, а не хешированные имена шрифтов.
- `@shelkovo/ui/standalone-error.css` — минимальный reset и отображение этих двух ролей для самостоятельной media 404. Он не содержит `@font-face`: для шрифтов нужны и `mediaFonts` в конфигурации, и `<Fonts media />` в head. Подключение не требует клиентского runtime.

Бюджет загрузки — в [дизайн-гайде](/docs/design/design-code-shelkovo.md#font-budget), источник и кеш сборки — в [документации разработки](/docs/development.md#шрифты-при-сборке).
