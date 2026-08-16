# AGENTS.md

Короткие правила для `apps/www/src/data/kb`. Подробное решение: `docs/decisions/015-markdown-first-knowledge-base.md`.

- Markdown-файлы базы знаний лежат в этой папке; корень раздела — `index.md`.
- В frontmatter разрешены `title`, опциональный `flags` и опциональный `seo.description`; поддержаны флаги `noindex` и `exclude-from-site-search`.
- `seo.description` использовать только для HTML meta description, когда автоматическая выдержка из Markdown слишком общая, короткая или повторяется на похожих страницах.
- `flags: [noindex]` не добавляет страницу в sitemap и ставит на HTML-страницу `robots: noindex, follow`.
- `flags: [exclude-from-site-search]` исключает страницу только из внутрисайтового Pagefind-поиска; HTML остается в sitemap и доступен внешним поисковикам.
- URL строится из пути: `index.md` дает `/kb/`, `services/internet/index.md` дает `/kb/services/internet/`, `services/gas.md` дает `/kb/services/gas/`.
- У каждой HTML-страницы есть Markdown companion: `/kb/index.md` для корня и `/kb/<slug>/index.md` для вложенных страниц.
- В Markdown companion внутренние ссылки на `/kb/.../` ведут на соответствующие `.md` companion-страницы.
- Не создавай одновременно `foo.md` и `foo/index.md`: они конфликтуют за один публичный URL.
- Дочерние страницы не выводятся автоматически. Если раздел должен ссылаться на вложенные материалы, добавь ссылки вручную в Markdown.
- Новости и редакционные объявления идут в `/news`; перебои сервисов, аварии и окна работ — в `/status`, не в `/kb`.
- Для публикации файлов KB в `kps-public` используй skill `public-media-publisher`; ключи принадлежат префиксу `kb/`, а материалы должны ссылаться на `media.kpshelkovo.online`.
