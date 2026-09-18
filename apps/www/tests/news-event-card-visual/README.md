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

Четыре PNG проверяют `variant="compact"`: с координатами и без места,
на desktop (1440px) и mobile (390px). На desktop ширина карточки равна 17.5rem,
как у сайдбара новости; на mobile карточка заполняет контейнер с отступами 1.25rem.
Тест отдельно проверяет отсутствие горизонтального переполнения страницы.
У события с координатами дата — 30 сентября: длинный месяц проверяет компоновку
рядом с текстовой кнопкой OpenMaps.

Fixture передаёт доменный `NewsEvent` из `lib/news/types` с camelCase-полями и
`satisfies NewsEvent`. Оба production-вызова в
`src/pages/news/[year]/[month]/[entry]/index.astro` используют `compact`: рядом с
текстом новости и в блоке события без текста. Ветка `wide` остаётся в компоненте;
текущих production-вызовов для неё нет, а #224 пока не определяет вариант будущей
карточки `/events`.

## Внешняя карта

До навигации Playwright блокирует `https://api-maps.yandex.ru/**` и устанавливает
через `addInitScript` минимальный mock SDK по образцу `compare-controls.browser.spec.ts`.
Настоящий API-ключ не требуется. Вместо тайлов
он вставляет `map-background.svg` и статичные ссылки copyright/OpenMaps из
`#map-sdk-fixture`. Настоящий `MapPreview` клонирует маркер из своего `template`
и передаёт его mock SDK для вставки в `[data-canvas]`.

Mock задаёт только готовую компоновку: приглушённую подложку, позицию маркера,
copyright снизу слева и OpenMaps сверху справа. Кнопка «Открыть Яндекс Карты»
имеет измеренный в настоящем SDK размер 163.875×36 px. Wrapper маркера — обычный
`div` без flex/grid, чтобы fixture не исправлял поведение inline-маркера.
Mock не моделирует географию, события SDK или API; поведение renderer проверяют Vitest-тесты.

Тест проверяет payload `data-preview`, видимый декоративный маркер в canvas,
ссылку места, исходный URL внешней карты и ICS. Штатные действия должны получать
фокус с клавиатуры и быть доступны указателю, а copyright — оставаться ниже
кнопок карточки. Геометрические проверки требуют размер маркера 18×18 px
и отсутствие пересечений дня и месяца с прямоугольником OpenMaps.
Для события без места проверяется отсутствие превью, маркера
и всех ссылок, кроме ICS. Снимки защищают компоновку сайта, а не точный вид SDK.
