## Context

- Мотивация описана в [proposal.md](proposal.md). Это уточнение публичного формата в продолжение #751 / PR #755.
- `buildPlaceMarkdown` в `apps/www/src/lib/places/markdown.ts` сейчас сериализует только children: H1, summary, подготовленный body, сведения, печатные часы, собственные ссылки и backlinks. Route `pages/map/[slug]/index.md.ts` строится для полного dataset, включая скрытые с карты места.
- `reviews/markdown.ts`, `contacts/markdown.ts`, `news/markdown.ts` уже используют `createMarkdownDocument({ frontmatter, children })`; наличие `title` во frontmatter не отменяет H1 и вводный текст.
- `places/map-public.ts` содержит private adapter `toPublicOpeningHours`, который переводит доменные `opensAt`/`closesAt` в `opens_at`/`closes_at`. JSON не содержит timezone. `places/opening-hours.ts` использует private константу `PLACE_TIME_ZONE = 'Europe/Moscow'`.
- [ADR-008](../../../docs/decisions/008-markdown-ast-generation.md) задаёт AST/YAML-сериализацию; [ADR-013](../../../docs/decisions/013-raw-domain-public-data-boundary.md) — отдельную public-границу; [ADR-028](../../../docs/decisions/028-markdown-first-places-map.md) — Markdown companions и независимость карточек от видимости на карте. Новый архитектурный механизм и отдельный ADR не нужны.
- `place-opening-hours` требует печатную неделю для Markdown и пояснение под ней: это прямой конфликт с выбранным форматом. Delta заменяет три требования целиком, сохраняя все их сценарии с уточнением представления. Требования валидации, вычисления статуса и JSON не меняются. `place-map-visibility` не требует изменения.

## Goals / Non-Goals

**Goals:**

- Сделать метаданные доступными без разбора русских подписей в body.
- Использовать один перевод интервалов на public-границе для Markdown и JSON, сохранив разные оболочки этих форматов.
- Сохранить читаемую карточку с редакционным текстом и контекстом упоминаний.

**Non-Goals:**

- Миграция raw/frontmatter исходных мест, расширение расписаний, изменение HTML, общей карты, JSON и Markdown-индекса.
- Полный экспорт доменной модели: геометрия, marker, searchAliases, nameCases, showOnMap и внутренние идентификаторы контактов во frontmatter не входят.
- Новая схема discovery/OpenAPI, версия API, дублирующий feed или поддержка старых generated-разделов рядом с frontmatter.

## Decisions

### 1. Минимальный явный public frontmatter

- `title`: `place.name`. Отдельные `name` и `slug` не нужны: первое дублирует title, идентичность карточки задаёт canonical URL.
- `category`: машинный код категории (`entrance`, `children`, `sport`, `walking`, `food`, `services`, `nature`, `water`, `infrastructure`), без русской подписи.
- `status`: lifecycle-код `existing`, `planned` или `underConstruction`, как в JSON карты. Это не текущий статус работы; raw-вариант `under_construction` наружу не переносится.
- `address`: строка только при наличии адреса.
- `coordinates`: объект с числовыми `lat` и `lng`, без округления и преобразования в строку.
- `html_url`: `place.canonical`, canonical HTML-карточка, без `?h=`.
- `map_url`: абсолютный `place.mapUrl`, включая уже вычисленный loader-ом fallback на Яндекс Карты.
- `contact_url`: абсолютный `place.contact.url` только при наличии связанной карточки «Сарафана»; не её raw ID и не ссылка на Markdown.
- `index_url`: абсолютный `placesMarkdownUrl()`, то есть `/map/index.md`. Это навигация по разделу, не обещание присутствия самого места на карте и не ссылка фокуса `?h=`.
- `opening_hours`: только при наличии расписания; `timezone: Europe/Moscow`, `periods` в существующем публичном формате `days`, `opens_at`, `closes_at`; `description` только при наличии пояснения.
- Summary остаётся вводным абзацем, без дополнительного поля. Отсутствующие optional-поля не сериализуются ни как пустые значения, ни как `null`/`undefined`.

ADR-013 предпочитает camelCase для новых public DTO. Здесь осознанно продолжается snake_case-семейство существующих Markdown companions и расписания JSON карты, согласно выбранному `opening_hours`: `html_url` уже опубликован в JSON, `opens_at`/`closes_at` переиспользуются буквально. Это локальное решение внешнего контракта; доменная модель остаётся camelCase. Альтернатива `openingHours` создала бы второй формат тех же интервалов, а русские labels потребовали бы разбирать локализованный текст.

Иллюстративный пример (не новая редакционная запись):

```yaml
---
title: Пример места
category: food
status: existing
address: Пример адреса
coordinates:
  lat: 55.06
  lng: 37.72
html_url: https://kpshelkovo.online/map/example-place/
map_url: https://yandex.ru/maps/?pt=37.72,55.06&z=17&l=map
contact_url: https://kpshelkovo.online/sarafan/food/example-place/
index_url: https://kpshelkovo.online/map/index.md
opening_hours:
  timezone: Europe/Moscow
  periods:
    - days: [mon, tue, wed, thu, fri]
      opens_at: '09:00'
      closes_at: '13:00'
    - days: [mon, tue, wed, thu, fri]
      opens_at: '14:00'
      closes_at: '18:00'
  description: Вход со двора.
---
```

Фактический сериализатор выбирает блочные коллекции и необходимые кавычки. Дни без интервалов означают выходные; дополнительные записи выходных, печатные строки недели и вычисленное на момент сборки open/closed не нужны. Массивы сохраняют исходные валидированные интервалы и их порядок: сортировку/группировку для HTML не переносим в public adapter.

### 2. AST и маленькая public-граница

- Добавить readonly-тип frontmatter в `places/markdown-public-dto.ts` и adapter в `places/markdown-public.ts`; типы не хранить вместе с исполняемым кодом и не отдавать `Place` через spread.
- Экспортировать существующий `toPublicOpeningHours` из `map-public.ts` и использовать его из Markdown adapter. Его результат и JSON остаются прежними; timezone добавляется только в Markdown-оболочке расписания. Общий абстрактный serializer или перенос всего map adapter в новый слой не нужен.
- Экспортировать существующую `PLACE_TIME_ZONE` из `opening-hours.ts` для Markdown adapter: одно значение для расчёта статуса и публикации, без нового пользовательского параметра timezone.
- Передать frontmatter и children в `createMarkdownDocument`, затем вызвать `serializeMarkdownDocument`. Локальный helper `serialize(children)` оставить для индекса.
- Из detail children убрать только generated «Сведения», часы с пояснением и «Ссылки». Сохранить порядок H1 → summary → `parseMarkdownFragment(place.body)` → `backlinksSection(place)`. Авторские заголовки или сведения внутри body не удалять и не дедуплицировать эвристиками.

Альтернативы: копировать mapping интервалов в Markdown — риск расхождения; отдавать объект JSON целиком — утечка лишних полей и зависимость от map selection; добавлять опциональный frontmatter в общий index-helper — ненужное изменение независимого пути.

### 3. Discovery и документирование

- Реестр `places/public-surface.ts` уже содержит HTML/Markdown detail, индекс и JSON. `lib/discovery.ts` строит каталог из реестра; маршруты и media types остаются верными.
- Уточнить существующее описание карты в `lib/llms.ts`: индекс относится к видимым местам, метаданные отдельной Markdown-карточки и часы находятся во frontmatter, редакционный текст и упоминания — в body. Это единственное необходимое изменение discovery-текста; отдельный `/map/llms.txt` не нужен.
- При реализации русский публичный текст проходит `humanizer-ru`. Полный перечень полей фиксируется в capability `place-markdown-card`, без копии схемы в путеводителе.

## Risks / Trade-offs

- Потребители, разбирающие generated-разделы body, потеряют прежнюю структуру → явно обозначить breaking change в PR и описать новый формат в существующем путеводителе; двойную публикацию не сохранять.
- `status` можно спутать с open/closed → закрепить lifecycle-смысл в контракте; тестировать отсутствие вычисленного состояния в статическом документе.
- Переиспользование adapter может случайно расширить JSON timezone-полем → добавлять timezone только в Markdown adapter и прогнать существующие JSON-тесты без изменения ожидаемого контракта.
- Удаление generated «Ссылки» может потерять навигацию → проверить все четыре URL-поля и отдельно Markdown-ссылки backlinks.
- Изменение spec может ослабить HTML-поведение → сохранить названия и все сценарии трёх MODIFIED-требований, а регрессии печатной недели, интервалов и статуса прогнать без изменения семантики.

## Migration Plan

- После отдельного разрешения реализовать change в текущей ветке и в составе PR #755. Исходные записи мест не мигрируют.
- Приёмка: Zod-проверка распарсенного YAML и отдельные проверки body; существующие тесты HTML/часов/валидации/JSON; typecheck и build. На готовой сборке разово просмотреть карточки с расписанием и без него, `/map/index.md`, JSON и discovery. Постоянный smoke-обход не добавлять.
- Обязательной production-приёмки нет: формат генерируется статически и проверяется до публикации. Человеческое ревью и merge остаются за владельцем.
- После реализации и проверок выполнить sync/archive этого change штатным workflow в той же ветке, затем обновить существующий PR при наличии разрешения на публикацию.
- Откат — вернуть изменения генератора, adapter, тестов, discovery и соответствующих specs единым обратным изменением; контент и JSON не требуют обратной миграции.
