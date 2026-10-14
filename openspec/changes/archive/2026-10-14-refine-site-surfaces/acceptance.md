# Приёмка стеклянных поверхностей

Задача [#1049](https://github.com/silentroach/kpshelkovo/issues/1049), change `refine-site-surfaces`. База — `c7f297b870334695a1de1d6ea7b215c642dff1ca`. Вариант C и общее применение приняты владельцем; [коммит согласования](https://github.com/silentroach/kpshelkovo/commit/30cb4d5b), [отметка в issue](https://github.com/silentroach/kpshelkovo/issues/1049#issuecomment-6176014524).

## Результат

Стекло C перенесено в app-owned tokens и scoped CSS. Навигация использует градиент 96 → 82 → 92%, панели с мелкими сведениями — 98 → 92 → 96%, закреплённый итог — плотный приглушённый материал 99 → 96%. Общий blur 20 px с насыщенностью 110%; два уровня двухслойных теней согласованы по роли поверхности.

Меню, поиск, обе карты, панель слоёв и подсказки читаются поверх фона. У выбранной строки меню нет отдельной внешней тени; встроенное событие в потоке также стало плоским. Стеклянные факты поселка используют более плотный материал чтения без внешней тени. Дизайн-гайд обновлён одновременно с токенами и их потребителями.

Текст, значения, URL, размеры и позиционирование панелей не менялись. Клиентские импорты, условия загрузки и сборки не менялись; новые зависимости, шрифты и сетевые запросы не добавлены. Обязательное сравнение bundle-отчётов для изменений импорта или загрузки здесь не требуется.

## Проверки кода

- `pnpm test` прошёл: www — **241 файл, 1996 тестов**; остальные workspace-пакеты прошли, часть результатов взята из актуального Turbo cache.
- `pnpm typecheck` и `pnpm lint` прошли. После последних CSS-уточнений повторены typecheck и адресный Oxlint из корня с `--format=agent`.
- `pnpm --filter @shelkovo/www test:search-quality` прошёл: production-сборка с индексом и **5 сценариев**. После уточнений границ и слоя стрелок выполнена актуальная production-сборка, затем те же пять проверок отдельно на её индексе. Первый адресный повтор был вызван из корня с отсутствующим config и не стартовал; правильный вызов из `apps/www` прошёл.
- **46/46 Chromium-сценариев** header, compare, tooltip регламента, status-calendar и sticky прошли на статической production-сборке. После последних CSS-уточнений попапов повторены затронутые **15 compare-сценариев**, все прошли; прочие проверенные входы не менялись.
- После уточнения стрелок адресные unit-тесты обеих карт — **54/54**. Официальный Svelte-autofixer ошибок не нашёл; рекомендации к прежним `bind:this` и Map/Set в `PlaceMap` не стали причиной постороннего рефакторинга.
- WebKit: **23 из 28** сценариев прошли. Пять ошибок шапки воспроизведены на отдельной production-сборке исходной базы; решение владельца и границы описаны ниже.

## Снимки и материалы

Снимки с вычисленными стилями находятся в [acceptance](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/). Измерения JSON фиксируют URL, viewport, переполнение, геометрию и материал видимых поверхностей. Статический preview использовал готовую production-сборку и индекс на `127.0.0.1:14339`; настоящие карты — разрешённый dev на `localhost:4321`.

- Меню: [1440 px](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/menu-1440.webp), [390 px](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/menu-390.webp), [320 px](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/menu-320.webp), [дневной фон на 320 px](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/menu-day-320.webp), [выбранная строка](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/menu-selected-320.webp). Открытие с клавиатуры, hover, повторное переключение, Escape и возврат фокуса покрыты существующими сценариями.
- Поиск: [1440 px](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/search-1440.webp), [390 px](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/search-390.webp), [320 px](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/search-320.webp). Запрос «тариф»; контур фокуса обводит диалог, линия под вводом не появилась. Пустой запрос, выдача, Tab/Shift+Tab, Escape и возврат фокуса подтверждены поисковым набором.
- Итог и подсказка калькулятора: [прокрутка на desktop](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/calculator-scroll-1440.webp), [tooltip desktop](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/calculator-tooltip-1440.webp), [tooltip 390 px](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/calculator-tooltip-390.webp). При прокрутке шапка имеет y=0, итог y=57. Диагностическая последовательность 90 кадров `requestAnimationFrame` с прокруткой не дала кадров дольше 50 мс, максимум 17.2 мс; это не профиль слабого телефона и не гарантия частоты кадров на других устройствах.
- Статус: [подсказка desktop](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/status-tooltip-1440.webp), [390 px](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/status-tooltip-390.webp), [календарная подсказка](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/status-calendar-tooltip-390.webp).
- Поселок: [подсказка поверх фактов, 1440 px](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/settlement-tooltip-1440.webp), [мобильная подсказка](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/settlement-tooltip-390.webp). Прежнее переполнение последней вынесено в #1078; размер и положение до/после совпали.
- Обычные разделы: новости, статья, KB, отзывы, Сарафан, человек, события, мероприятие, место и поселок сняты на 1440/390/320 px — **30 начальных состояний**, у всех переполнение документа 0 px. Статические снимки карт с ошибкой загрузки SDK проверяют доступность текста и плоское оформление, но не заменяют SDK-сверку. Встроенное событие с настоящей картой: [1440 px](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/event-sdk-1440.webp), [390 px](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/event-sdk-390.webp).

## Настоящие карты

- Попап участка: [1440 px](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/map-1440.webp), [390 px](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/map-390.webp), [320 px](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/map-320.webp), [фокус закрытия](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/map-focus-320.webp). Enter закрывает попап и снимает параметр `p`; фоновые номера больше не образуют читаемый слой под сведениями.
- Слои: [1440 px](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/layers-1440.webp), [320 px](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/layers-320.webp). Панель остаётся самостоятельным слоем, поля и подписи читаемы.
- После настоящего drag: [панель ниже точки](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/map-upper-position-390.webp), [панель выше точки](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/map-lower-position-390.webp).
- Сравнение: [1440 px](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/compare-popup-1440.webp), [390 px](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/compare-popup-390.webp), [фокус закрытия на 320 px](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/compare-popup-focus-320.webp). У обоих положений после drag отдельно подтверждён стык: [панель ниже точки](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/compare-arrow-lower-390.webp), [панель выше точки](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/compare-arrow-upper-390.webp). При настоящем drag сравнение закрывает попап по прежним правилам; для повторного открытия использованы доступные фокус и Enter маркера.
- Размытие создаёт stacking context панели: её стрелке назначен локальный z-index 1, чтобы соединение не терялось под гранью и тенью. Географическая привязка, размер стрелки и прежнее условие безопасного примыкания не менялись. Скрытие у округлённого края подтверждено адресными unit-тестами.
- Прокрутка попапа подтверждена диагностически: при root 200% и высоте `.place-map` 180 px панель имеет clientHeight 97, scrollHeight 222 и принимает scrollTop 100, сохраняя `overflow-y: auto`. [Снимок](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/map-constrained-scroll-390.webp). Ограничение высоты используется только в проверке, не предлагается для production.

## Непрозрачный режим и контраст

- Первое обращение к CDP включило media preference, но следующий вызов browser CLI восстановил обычную эмуляцию до снимка. Reviewer обнаружил, что прежний JSON показывал blur вместо fallback; тот результат не принят и заменён корректной проверкой.
- Повтор выполнен через одно CDP-соединение: после `Emulation.setEmulatedMedia` проверены `matchMedia`, вычисленные цвета и фильтр, затем сделан снимок без промежуточного CLI-вызова. [JSON](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/menu-390-reduced-transparency.json) содержит `reducedTransparency: true`, `backgroundImage: none`, непрозрачный `backgroundColor: oklch(1 0 0)` и `blur: none` для меню и поиска. [Снимок](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/menu-390-reduced-transparency.webp).
- Отсутствие blur проверено отключением поддерживаемой `@supports`-ветки CSSOM в текущем документе. [JSON](/openspec/changes/archive/2026-10-14-refine-site-surfaces/acceptance/menu-390-without-support-branch.json) подтверждает непрозрачный backgroundColor и отсутствие blur. Это диагностика fallback-ветки, не запуск настоящего старого браузера.
- Расчёт минимальной плотности и чёрной подложки сохранён в [comparison](/openspec/changes/archive/2026-10-14-refine-site-surfaces/comparison.md#контраст): основной текст меню 9.46:1, `primary` 6.24:1, фокус 3.77:1; вторичный текст панелей чтения 4.71:1, итоговой полосы 4.61:1. Фокус и функциональные рамки сохраняют действующие непрозрачные цвета.

## Прежние ограничения и решение владельца

Владелец разрешил завершить #1049 без расширения на подтверждённые прежние проблемы:

- [#1079](https://github.com/silentroach/kpshelkovo/issues/1079): четыре WebKit-проверки конкретного порядка Tab и одна проверка scroll lock поиска. Все пять ошибок повторены на отдельной сборке исходной базы. Порядок Tab требует различить настройки клавиатурного доступа и дефект UI; ошибка ожидания сама по себе не доказывает недоступность ссылки. ScrollY после wheel стал 327 и на базе, и на текущей ветке, с разными промежуточными исходными значениями.
- [#1078](https://github.com/silentroach/kpshelkovo/issues/1078): мобильная подсказка тарифа Николино на 390 px выходит вправо на 9 px. До/после left=40, width=358.796875, right=398.796875.
- Диагностический root font size 200% сохраняет прежнее переполнение: меню на 390 px — 28 px, калькулятор на 320 px — 201 px; отдельная база дала те же результаты. Это не настоящий browser zoom; существующие задачи #1069–#1073 сохраняются.
- Системная Safari-проверка, browser zoom, печать и профиль производительности слабого мобильного устройства остаются ручными ограничениями. WebKit-проверка относится к установленному движку Playwright, а не пользовательской конфигурации Safari. Прежние #1075–#1076 о геометрии попапа сравнения не расширялись.

## Ревью

Первый независимый проход reviewer охватил diff от базы, код и гайд и выявил недостоверный результат fallback-проверки; он исправлен повтором с сохранением эмуляции. Появившиеся снимки, итоговый отчёт, слой стрелок и дальнейшие sync/archive-правки передаются на повторное ревью зафиксированного состояния.

Повтор reviewer проверил зафиксированный `bd561946012069a8026826a0891a9690cc9dd027` от базы: код, гайд, change, JSON и снимки fallback и обоих положений стрелок. Подтверждённых проблем и обоснованных упрощений не найдено; замечание первого отчёта снято. Результаты сборки и тестов reviewer принял по отчёту автора без повторного запуска. Последующие sync/archive-правки проверяются отдельно.

Все собственные браузерные сессии закрыты; dev и оба статических preview остановлены. Структурная валидация OpenSpec и проверка внутренних ссылок прошли перед итоговым ревью.
