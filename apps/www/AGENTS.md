# AGENTS.md

Локальные инструкции для корневого сайта `kpshelkovo.online`.

## Команды

```bash
pnpm dev
pnpm build
pnpm typecheck
```

## Local dev

- `pnpm dev` внутри app поднимает root-site на `http://localhost:4321`.
- `/815/compare` живет в этом же Astro-приложении, без отдельного compare dev-server.
- Если порт `4321` занят, команда должна завершиться ошибкой, а не тихо перейти на другой порт.

## Стек

- Astro 7 (static output)
- Svelte 5 с runes для интерактивных compare-компонентов
- Нативный CSS с app-owned foundation в `src/styles/global.css`

## Дизайн

- За визуальными решениями, палитрой и компонентными правилами идти в `../../docs/design/design-code-shelkovo.md`.
- За правилами `title` и `description` страниц идти в `../../docs/page-meta.md`.
- Этот `AGENTS.md` держать про workflow, архитектуру и ограничения app-а.

## Правила

- Compare данные живут в `src/data/compare`, logic/components — в `src/compare`, routes — в `src/pages/815/compare`.
- При изменении поискового кода и UI, разметки индексирования, metadata, правил корпуса, весов, настроек или версии Pagefind, поисковых тестов и `search_aliases` подключать skill `site-search`; он задаёт ручную проверку релевантности до/после по запросам задачи и проверку пользы алиасов. Обычное пополнение материалов по действующим правилам само по себе не требует поисковой приёмки.
- Compare URL/base задается в `src/compare/lib/url.ts`; не завязывать его на Astro `base`.
- Для CSS-владения следовать [ADR-034](../../docs/decisions/034-native-css-architecture.md): глобальные tokens, reset, site-level `ui-*` и generated-content styles принадлежат `apps/www`, а reusable package-компоненты владеют scoped CSS и документируют нужные semantic properties.
- Для imports внутри `apps/www/src` предпочитать alias `@/…` вместо длинных relative-путей; относительные imports оставлять только для соседних файлов и путей вне `src`.
- Новые `.test.ts` в `apps/www` хранить в ближайшей папке `tests/`, а не рядом с исходным файлом.
- Любые UI-подписи с количеством на русском языке обязательно склонять корректно (`1 новость`, `2 новости`, `5 новостей`).
- Если нужна ссылка на compare, вести на `/815/compare/`, а не на legacy домен.
- Если меняется deploy/base/root behavior, синхронно обновлять `ops/nginx/kpshelkovo-online.conf`.

## Клиентский JavaScript

- Проектный исполняемый код по умолчанию держать в обработанных модулях: `src/scripts/*`, компонентных `<script>` без `is:inline` или других собранных ассетах.
- Raw inline-обработчики HTML вроде `onclick="..."` запрещены политикой `script-src-attr 'none'`; подключать обработчики из клиентского модуля.
- Новый raw inline-скрипт допустим только с отдельным обоснованием и синхронной записью в [CSP.md](/ops/nginx/CSP.md). Причины существующих исключений для генераторов и интеграций — в [ADR-017](/docs/decisions/017-csp-inline-exceptions-for-astro-yandex-maps.md).

## Markdown

- При изменении рендера или генератора сверять API с [README пакета](../../packages/markdown/README.md). Причины разделения слоёв — в [ADR-003](../../docs/decisions/003-markdown-pipeline-layering.md), выбора AST — в [ADR-008](../../docs/decisions/008-markdown-ast-generation.md).
- Динамические текстовые блоки, которые рендерятся в HTML из markdown, CMS или других данных, прогонять через типограф на этапе рендера.
- Типограф применять точечно к самому динамическому контенту, а не к целому layout или полной HTML-странице.
- Правила типографики менять в `@shelkovo/markdown`; app-wrapper выбирает место применения и не держит собственный набор правил.
- Для body markdown в `apps/www` использовать `@/lib/markdown/render`, а не пакетный `render` напрямую: app-wrapper подключает общий app-level слой mentions.
- У отдельного Markdown-изображения непустой `title` рендерится видимой подписью: `![alt](url "Подпись")`. У изображения внутри текстового абзаца `title` остается обычной всплывающей подсказкой.
- Если loader хранит уже подготовленный body markdown, он должен получать его через helper из `@/lib/markdown/render`, чтобы mentions/backlinks и HTML-render использовали один app-level pipeline.
- Для публичных `.md` и `llms.txt` следовать [корневым правилам AST-генерации](../../AGENTS.md#локальные-инструкции).
- Низкоуровневые helpers пакета можно импортировать напрямую по назначению из README: типографика коротких строк, извлечение текста, обработка AST и генерация Markdown. Плагины типографики использовать в конфигурации соответствующего Markdown pipeline. Прямой пакетный `render` допустим в app-wrapper и низкоуровневых тестах или конфигурациях, где не рендерится body markdown сайта.
- Новые Markdown preprocessors, специфичные для сайта, добавлять в `@/lib/markdown/render` и его options, а не в `@shelkovo/markdown` и не в параллельный pipeline.
- Общий Markdown-пакет не должен импортировать данные и route-утилиты сайта; доменные реестры, ошибки и backlinks принадлежат приложению.
- Новые редакционные mention-enabled body surfaces должны подключать общий `SiteMentionRegistry` из `@/lib/mentions`; не добавлять отдельный people-only preprocessor.

## Entity Mentions

- При редактуре упоминаний, подключении нового контекста или изменении backlinks сверяй [entity-mentions](/openspec/specs/entity-mentions/spec.md); причины общего app-level слоя — в [ADR-001](/docs/decisions/001-markdown-slug-mentions.md) и [ADR-012](/docs/decisions/012-entity-mention-graph.md).
- Люди и места входят в единый `SiteMentionRegistry`; их короткие slug не должны пересекаться.
- В `src/data/people/*.md` живут профили людей для раздела `/people/`; canonical slug человека равен имени файла без `.md`, например `kschemelinin`.
- Если человек из `people` упоминается в `news`, `status` или другом редакционном Markdown body, в source markdown нужно писать `@slug`, `@slug:case` или `[видимый текст](@slug)`, а не plain text имя и не ручную ссылку на `/people/.../`.
- `@slug` использовать, когда в тексте нужно показать каноническое имя человека в именительном падеже.
- `@slug:case` использовать, когда в тексте нужно показать имя человека в другом падеже.
- `[видимый текст](@slug)` использовать, когда видимым текстом должна остаться авторская фраза: роль, описание, ссылка-атрибуция или другая грамматическая конструкция.
- Поддерживаемые падежи mention: `nom`, `gen`, `dat`, `acc`, `ins`, `prep`; без модификатора используется `nom`.
- Если нужен не `nom`, сначала добавь форму в `name_cases` профиля человека, например `name_cases.gen`, затем используй `@kschemelinin:gen`.
- При рендере canonical mention автоматически раскрывается в имя нужного падежа и ссылку на профиль; labelled mention сохраняет авторский видимый текст и заменяет `@slug` на ссылку профиля.
- Не использовать `[текст](@slug:case)`: этот формат не поддерживается, потому что падеж в labelled mention должен быть написан в самом видимом тексте.
- Неизвестный `@slug` или отсутствующий `name_cases.case` должен падать на билде и исправляться до merge.
- Каноническое упоминание места раскрывается в название и ссылку `/map/[slug]/`; нужные падежные формы хранятся в `name_cases` места.
- Профиль человека и место не могут упоминать сами себя в собственном Markdown body.
- Если у профиля есть `position` и/или `company`, они должны попадать в title markdown-ссылки mention как контекст человека.
- Для атрибуции к внешнему источнику ссылку ставь на вводную фразу, например `[По словам](https://t.me/...) @kschemelinin, ...`.
- Source refs публикуют адаптеры источников, подключённые в [composition root](/apps/www/src/lib/site-mention-graph.ts); общий graph не импортирует доменные datasets. Структурные связи мероприятий определяет [news-event-places](/openspec/specs/news-event-places/spec.md), формат Markdown-карточки места — [place-markdown-card](/openspec/specs/place-markdown-card/spec.md).

## Data Boundaries

- При добавлении или изменении источника данных соблюдать границы Raw DTO → domain model → Public DTO; причины разделения — в [ADR-013](../../docs/decisions/013-raw-domain-public-data-boundary.md).
- YAML, frontmatter и ответы внешних сервисов проверять raw Zod-схемой. Default-значения и нормализации схемы относятся к чтению источника; raw-тип можно выводить через `z.output` или `z.infer`.
- Доменные типы писать явно, с `camelCase`-полями и JSDoc для неочевидного смысла. Они не импортируют Zod и не выводятся из его схем. Домен — readonly-снимок: вложенные объекты и коллекции по возможности тоже readonly; runtime `Object.freeze()` не требуется. Для изменения создавать новый объект или отдельное представление.
- Mapper — единственное место перевода Raw DTO в домен; вызывать его рядом с `getCollection()` или другим внешним входом. Он явно собирает доменную запись: различающиеся представления и enum-значения переводит, совпадающие по смыслу и допустимым значениям может присваивать напрямую. В mapper-е можно вычислять производные поля доменного снимка и проверять его инварианты; Zod `transform()` и общий recursive `snakeToCamel()` его не заменяют.
- Схемы, доменные типы и mapper-ы хранить в разных файлах. Raw-схемы не импортируют доменные типы; mapper импортирует обе стороны. Внутренний код использует доменные типы и loaders, а public adapters — доменную модель и отдельные публичные типы.
- Публичные JSON/agent-facing форматы собирать отдельным Public DTO adapter. Public DTO может выводиться из собственной публичной Zod-схемы; raw-схема и доменная модель не подменяют публичный контракт.
- Новые публичные DTO используют `camelCase`, если внешний стандарт не требует другого формата. Существующий опубликованный формат сохранять при внутреннем рефакторинге; намеренное изменение согласовывать отдельно и синхронно обновлять схемы, discovery, llms-документы и тесты. `snake_case` и внешние enum-значения допустимы на raw/legacy public границах и в их adapters, fixtures и документации внешнего формата.
- JSON-ответы и JSON-артефакты сборки сериализовать компактно, без отступов и завершающего перевода строки.

## Agent-Facing Surfaces

При изменении section routes, Markdown companions, JSON feeds, `llms.txt`, публичных skills или discovery docs сверяй связанные поверхности с [public-content-discovery](/openspec/specs/public-content-discovery/spec.md), а HTTP-выдачу Markdown — с [public-markdown-delivery](/openspec/specs/public-markdown-delivery/spec.md). Новую публичную поверхность регистрируй в [реестре](/apps/www/src/lib/public-surface/index.ts) или явно обоснуй исключение по границам [ADR-011](/docs/decisions/011-public-surface-registry.md).
