# News Event Card Visual Fixture

Локальный fixture для screenshot tests компонента `NewsEventCard`.

## Команды

```bash
pnpm --dir apps/www run test:visual:news-event
pnpm --dir apps/www run test:visual:news-event:update
```

Если Chromium еще не установлен локально:

```bash
pnpm --dir apps/www exec playwright install chromium
```

## Что здесь важно

- fixture живет вне production `src/pages`
- тесты запускают отдельный local-only Astro preview на `127.0.0.1:4327`
- Playwright снимает только fixture locator, а не всю страницу

## Покрытие

Четыре PNG проверяют `variant="compact"`: с координатами и только с текстовым местом,
на desktop (1440px) и mobile (390px). На desktop ширина карточки равна 17.5rem,
как у сайдбара новости; на mobile карточка заполняет контейнер с отступами 1.25rem.
Тест отдельно проверяет отсутствие горизонтального переполнения страницы.

Fixture передаёт доменный `NewsEvent` из `lib/news/types` с camelCase-полями и
`satisfies NewsEvent`. Оба production-вызова в
`src/pages/news/[year]/[month]/[entry]/index.astro` используют `compact`: рядом с
текстом новости и в блоке события без текста. Ветка `wide` остаётся в компоненте;
текущих production-вызовов для неё нет, а #224 пока не определяет вариант будущей
карточки `/events`. Старые четыре эталона `wide` заменены снимками `compact` под
теми же именами.

## Внешняя карта

До навигации Playwright перехватывает запрос `https://yandex.ru/map-widget/v1/**`
и отвечает локальным `map-background.svg`. Документ Яндекса, его скрипты и тайлы
не загружаются. Схема намеренно условная и не содержит маркера: iframe, его сдвиг,
обрезка, прозрачность и собственный маркер сайта остаются частью снимка.

Тест ждёт загрузки SVG внутри iframe, проверяет URL карты, наличие маркера и
отрисовку обеих иконок действий. Для текстового места проверяет отсутствие
iframe/маркера и ссылку на поиск места. Ссылки на ICS проверяются в обоих состояниях.
Снимки защищают компоновку сайта, но не географию и интерфейс Яндекс Карт.
