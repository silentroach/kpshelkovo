# `@shelkovo/ui`

Компоненты пакета владеют своим scoped CSS. Host-приложение передает им только используемые semantic custom properties:

- `Breadcrumbs.astro`: `--color-primary`, `--color-primary-hover`, `--color-text`, `--color-text-muted`;
- `LinkWithIcon.astro`: `--color-primary`, `--color-primary-hover`, `--color-telegram`;
- `SiteFooter.astro`: `--color-border`, `--color-primary-hover`, `--color-text`, `--color-text-muted`, `--font-body`, `--page-max`, `--page-padding`;
- `StarRating.astro`: `--color-border-strong`, `--color-star`.

`NotFoundView.astro` остается standalone-компонентом со своей палитрой и шрифтами. Брендовые SVG-иконки содержат fallback-цвета для standalone-использования.
