# Proposal

## Why

В [#781](https://github.com/silentroach/kpshelkovo/issues/781), части [#776](https://github.com/silentroach/kpshelkovo/issues/776), нужно дать публичным представлениям действующего владельца требований вместо повторов в ADR-009/011/022/036. При переносе KB в PR #834 потерялось нормативное правило `noindex, follow` для Markdown, хотя response helper и nginx его сохранили.

## What Changes

- Выделить `public-markdown-delivery`: прямой и negotiated-доступ к объявленному Markdown, включая общий документ раздела и Markdown-only вход, MIME, cache policy, обе оси `Vary`, alternate-связи с существующими представлениями и `noindex, follow` обычных companions, включая KB; публичные `SKILL.md` остаются отдельным исключением.
- Выделить `public-content-discovery`: согласованность опубликованных ресурсов и каталогов, наиболее конкретный llms с корневым fallback, структуру H1/blockquote/необязательное введение/H2 со списками именованных абсолютных ссылок, объяснение полноты источников и разрешающие AI Content-Signal.
- После согласования оставить в ADR причины архитектурных решений и ссылки на specs. Реестр остаётся описательным; его устройство и AST-генерация не становятся схемой публичных полей.
- В `events-calendar` заменить повтор общих правил доставки и discovery ссылками на их владельцев, сохранив доступность Markdown и предметные сценарии мероприятий.
- Перенаправить HTTP-правила ADR-016 и `knowledge-base` к `public-markdown-delivery`, сохранив предметные правила отзывов и соответствие HTML/Markdown страниц KB. Уточнить границу реестра в ADR-011: корневые потребители используют общую карту, разделовые генераторы сохраняют самостоятельность.

## Capabilities

### New Capabilities

- `public-markdown-delivery`: доступ к Markdown и HTTP-связи с HTML, кешами и поисковыми роботами.
- `public-content-discovery`: обнаружение публичных представлений, навигационные путеводители и политика использования контента основного сайта.

### Modified Capabilities

- `events-calendar`: общие правила HTTP-доставки и выбора путеводителя делегируются `public-markdown-delivery` и `public-content-discovery`; оба способа доступа к Markdown сохраняются.
- `knowledge-base`: HTTP-владелец заменён прямой ссылкой на `public-markdown-delivery`; соответствие HTML/Markdown, флаги и переходы между страницами KB сохраняются.

## Impact

- Источники: [ADR-009](/docs/decisions/009-markdown-accept-negotiation.md), [ADR-011](/docs/decisions/011-public-surface-registry.md), [ADR-022](/docs/decisions/022-ai-content-signals-policy.md), [ADR-036](/docs/decisions/036-llms-v2-guides.md), [реестр](/apps/www/src/lib/public-surface/index.ts), [ответ Markdown](/apps/www/src/lib/markdown/response.ts), [nginx](/ops/nginx/kpshelkovo-online.conf). Предметные правила KB остаются в [knowledge-base](/openspec/specs/knowledge-base/spec.md).
- Объём реализации — перенос требований и редактура ADR/ссылок. Известное расхождение заголовков доставки ведётся в #479: перенос описывает требуемое поведение и не выдаёт его за подтверждённую исправность production. PR #908 закрыт без merge; ADR-043 отсутствует в базе `7371823385fa10fe52f3f7f8ff2cea325c922ea7`. Завершение #720 не означает внедрения отложенной архитектуры генератора nginx.
- Публичные llms остаются короткими путеводителями без требования вечного количества файлов. Полные документы и JSON сохраняют свои назначения; `llms-full.txt` не возвращаются. Проверки переноса не создают постоянный smoke-обход в CI.
- Соседние changes могут ссылаться на два канонических имени выше; разделовые политики внутренней/внешней индексации остаются у своих владельцев. Production-приёмка для документационного переноса не требуется; реализация ждёт отдельного разрешения на готовый change.
