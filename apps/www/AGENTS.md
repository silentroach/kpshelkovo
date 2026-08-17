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
- Tailwind CSS v4
- Shared styles from `@shelkovo/ui/styles.css`

## Дизайн

- За визуальными решениями, палитрой и компонентными правилами идти в `../../docs/design/design-code-shelkovo.md`.
- За правилами `title` и `description` страниц идти в `../../docs/page-meta.md`.
- Этот `AGENTS.md` держать про workflow, архитектуру и ограничения app-а.

## Правила

- Compare данные живут в `src/data/compare`, logic/components — в `src/compare`, routes — в `src/pages/815/compare`.
- Перед изменением Pagefind, поискового UI, индексируемой metadata, весов, quality-матрицы или `search_aliases` подключать skill `site-search`; сначала снимать production baseline, затем сравнивать выдачу после правки.
- Compare URL/base задается в `src/compare/lib/url.ts`; не завязывать его на Astro `base`.
- Любой reusable дизайн, токены и примитивы поднимать в `packages/ui`.
- Для imports внутри `apps/www/src` предпочитать alias `@/…` вместо длинных relative-путей; относительные imports оставлять только для соседних файлов и путей вне `src`.
- Новые `.test.ts` в `apps/www` хранить в ближайшей папке `tests/`, а не рядом с исходным файлом.
- Любые UI-подписи с количеством на русском языке обязательно склонять корректно (`1 новость`, `2 новости`, `5 новостей`).
- Динамические текстовые блоки, которые рендерятся в HTML из markdown, CMS или других данных, прогонять через типограф на этапе рендера.
- Типограф применять точечно к самому динамическому контенту, а не к целому layout или полной HTML-странице.
- Для body markdown в `apps/www` использовать `@/lib/markdown/render`, а не пакетный `render` напрямую: app-wrapper подключает общий app-level слой mentions.
- У отдельного Markdown-изображения непустой `title` рендерится видимой подписью: `![alt](url "Подпись")`. У изображения внутри текстового абзаца `title` остается обычной всплывающей подсказкой.
- Если loader хранит уже подготовленный body markdown, он должен получать его через helper из `@/lib/markdown/render`, чтобы mentions/backlinks и HTML-render использовали один app-level pipeline.
- Для публичных `.md`, `llms.txt` и `llms-full.txt` генерировать Markdown через `@shelkovo/markdown` AST API (`createMarkdownDocument`, `md`, `parseMarkdownFragment`, `serializeMarkdownDocument`) или общий app-helper поверх него, а не через ручной `lines.join('\n')` всего документа.
- Из `@shelkovo/markdown` напрямую в app использовать только низкоуровневые helpers по назначению: `formatDynamicHtml` для короткого готового HTML/text, `extractFirstMarkdownText` для excerpt, `rehypeTypograf` только в markdown pipeline config, AST API — для генерации публичного Markdown.
- Новые Markdown preprocessors, специфичные для сайта, добавлять в `@/lib/markdown/render` и его options, а не в `@shelkovo/markdown` и не в параллельный pipeline.
- Новые редакционные mention-enabled body surfaces должны подключать общий `SiteMentionRegistry` из `@/lib/mentions`; не добавлять отдельный people-only preprocessor.
- Если нужна ссылка на compare, вести на `/815/compare/`, а не на legacy домен.
- Если меняется deploy/base/root behavior, синхронно обновлять `ops/nginx/kpshelkovo-online.conf`.

## People Mentions

- Упоминания людей работают через общий app-level слой `src/lib/mentions`; `src/lib/people/mentions.ts` только адаптирует профиль человека в generic mention target.
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
- Если у профиля есть `position` и/или `company`, они должны попадать в title markdown-ссылки mention как контекст человека.
- Для атрибуции к внешнему источнику ссылку ставь на вводную фразу, например `[По словам](https://t.me/...) @kschemelinin, ...`.
- Source refs для backlinks публикуют соседние адаптеры разделов: `news/mentions.ts`, `status/mentions.ts`, `people/mention-refs.ts`; общий graph не должен импортировать доменные datasets источников.

## Data Boundaries

- YAML/frontmatter читать как Raw DTO через Zod-схему, переводить в handwritten readonly domain model через mapper, а публичные JSON/agent-facing форматы собирать отдельным Public DTO adapter. `snake_case` допустим только на raw/public legacy границах, fixtures и в документации внешнего формата.

## Agent-Facing Surfaces

Если меняются section routes, markdown companions, JSON feeds, `llms.txt`, skills или discovery docs для разделов, связанные agent-facing поверхности нужно синхронно пересматривать.
