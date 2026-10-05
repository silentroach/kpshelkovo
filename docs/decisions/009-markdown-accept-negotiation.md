# ADR-009: Markdown через `Accept` negotiation

## Статус

Принят

## Дата

2026-05-17; уточнён 2026-07-22.

## Контекст

Статический сайт публикует HTML для людей и Markdown для агентов и терминальных клиентов. Прямая ссылка на `.md` удобна для цитирования, а запрос публичной точки входа с `Accept: text/markdown` позволяет клиенту получить объявленное текстовое представление уже известного адреса.

Выбор формата по заголовку создаёт риск для общих кешей: без `Vary: Accept` кеш может вернуть HTML клиенту Markdown или наоборот. Вариация по сжатию через `Accept-Encoding` решает другую задачу и не заменяет вариацию по формату.

## Решение

Сохраняем оба способа доступа: отдельный Markdown URL и negotiation публичной точки входа по явному `Accept`. Объявленное представление может быть общим документом раздела; отдельная HTML-версия есть не у каждой Markdown-точки входа. Выбор делает nginx перед статической сборкой. User-Agent не определяет формат: клиент должен управлять им явно.

Действующий HTTP-контракт — [public-markdown-delivery](/openspec/specs/public-markdown-delivery/spec.md): MIME, кеширование, обе оси `Vary`, alternate-связи и `noindex, follow` обычных companions, включая KB, с отдельным исключением публичных `SKILL.md`. Связь с путеводителем принадлежит [public-content-discovery](/openspec/specs/public-content-discovery/spec.md).

Прямой `.md` выбирает ресурс путём. Обратная HTTP alternate-ссылка negotiated Markdown ведёт к опубликованному HTML-представлению, когда оно есть; требование такой ссылки у каждого прямого companion или Markdown-only входа добавило бы другой контракт.

## Рассмотренные альтернативы

- **Только прямые `.md` URL.** Проще кеширование, но клиенту пришлось бы сначала находить companion, а уже опубликованный доступ через canonical URL сломался бы.
- **Query-параметр вместо `Accept`.** Создал бы третий адрес того же содержания. Отдельный адрес уже есть у companion, а HTTP negotiation выражает выбор представления.
- **Выбор по User-Agent.** Ненадёжная эвристика усложнила бы cache key и лишила клиента явного контроля.
- **Отключение кеширования HTML.** Ухудшило бы обычную навигацию, не заменяя корректный `Vary` для промежуточных кешей. Причины короткого HTML-кеша — в [ADR-002](/docs/decisions/002-client-transitions-prefetch-cache.md).

## Последствия и точки сопровождения

- Доставку реализует [site-конфиг nginx](/ops/nginx/kpshelkovo-online.conf), HTML-объявления — [BaseLayout](/apps/www/src/layouts/BaseLayout.astro), заголовки app-ответа — [response helper](/apps/www/src/lib/markdown/response.ts).
- При изменении доставки или подключении CDN проверяют реальные HTML/Markdown-ответы и сохранность обеих осей `Vary`. Проверка helper не подтверждает поведение nginx и общего кеша.
- Известное расхождение delivery headers отслеживается в [#479](https://github.com/silentroach/kpshelkovo/issues/479). Оно не меняет нормативный контракт; перенос требований не подтверждает исправность production.
- Генерация Markdown и рендер остаются решениями [ADR-008](/docs/decisions/008-markdown-ast-generation.md) и [ADR-003](/docs/decisions/003-markdown-pipeline-layering.md).

## Источники

- [HTTP Semantics: Accept](https://www.rfc-editor.org/rfc/rfc9110.html#field.accept)
- [HTTP Semantics: Vary](https://www.rfc-editor.org/rfc/rfc9110.html#field.vary)
- [HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111.html)
