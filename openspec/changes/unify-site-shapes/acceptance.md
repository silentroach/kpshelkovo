# Приёмка форм сайта

Задача [#1048](https://github.com/silentroach/kpshelkovo/issues/1048), change `unify-site-shapes`. База — `9ff4de2e8d12751d6dfd68284e9c75f8bfa5f9de`; согласование примерки — `40827c15` и [отметка в issue](https://github.com/silentroach/kpshelkovo/issues/1048#issuecomment-6172285435).

## Результат

Принятые формы 8 / 12 / 16 px назначены по ролям. Поля с единицами сохраняют общий контур, короткие фильтры — капсулы, отдельные действия-иконки — круги. Плоские редакционные секции и мобильные строки остаются плоскими. Палитра, шрифты, данные, URL, размеры элементов, тени и прозрачность не менялись.

По результатам ревью уточнено условие показа стрелок попапов: у округлённого угла они скрыты, на прямом краю сохранены с исходной географической привязкой. По браузерной проверке исправлен приоритет локальных углов закреплённых таблиц; при прилипании они становятся прямыми, после возврата восстанавливаются.

## Проверки

- `pnpm --filter @shelkovo/www test`: **241 файл, 1996 тестов прошли**. Первый запуск обнаружил отсутствие токена радиуса в изолированной фикстуре рамки карты; фикстура дополнена, проверки не ослаблялись.
- Адресные тесты попапов после уточнения стрелок: **54/54 прошли**. Проверены оба края, обычное положение, resize и масштабирование размеров стрелки вместе с root font size.
- `pnpm lint`, `pnpm typecheck` и полный набор unit-тестов повторно прошли после уточнений стрелок и sticky-углов. Итоговая production-сборка прошла внутри `pnpm bundle:analyze`.
- Итоговые браузерные сценарии Chromium: **46 прошли** — 21 compare/sticky/tooltip (включая новую регрессию углов), 16 header-a11y, 9 status-calendar-focus. После изменений стрелок и sticky-углов повторён затронутый compare-набор; прежние результаты header/status остаются актуальными.
- Официальный Svelte-autofixer: ошибок в изменённых компонентах нет. У `PlaceMap` остались рекомендации к прежнему использованию `bind:this` и Map/Set; посторонний рефакторинг не выполнялся.
- Строгая структурная валидация активного change и основных specs прошла; после sync/archive выполняется штатная общая валидация.

## Браузерная сверка

Проверены 15 страниц на **1440 × 1000, 390 × 844 и 320 × 844**: главная, сравнение, калькулятор, два справочника регламента, карточка поселка, рейтинг, события, статус и его месячный архив, Сарафан, отзывы, профиль человека, новость и KB. На всех 45 начальных состояниях горизонтальное переполнение документа — **0 px**. Снимки находятся в [acceptance](/openspec/changes/unify-site-shapes/acceptance/).

- Сравнение: [desktop](/openspec/changes/unify-site-shapes/acceptance/compare-1440.webp), [телефон](/openspec/changes/unify-site-shapes/acceptance/compare-390.webp), [выбранный фильтр с фокусом на 320 px](/openspec/changes/unify-site-shapes/acceptance/compare-filter-focus-320.webp). Крайняя подпись целиком видна в прокручиваемой полосе; выбор, фокус и геометрия сохранены.
- Калькулятор: [общая поверхность](/openspec/changes/unify-site-shapes/acceptance/calculator-1440.webp), [ошибка значения](/openspec/changes/unify-site-shapes/acceptance/calculator-error-1440.webp), [фокус составного поля](/openspec/changes/unify-site-shapes/acceptance/calculator-focus-1440.webp). Ошибка сообщает причину и `aria-invalid`; сброс возвращает 81 778 и скрывает кнопку сброса.
- Закреплённые таблицы: [калькулятор](/openspec/changes/unify-site-shapes/acceptance/calculator-sticky-1440.webp), [имущество](/openspec/changes/unify-site-shapes/acceptance/assets-sticky-1440.webp), [услуги](/openspec/changes/unify-site-shapes/acceptance/services-sticky-1440.webp), [поселок](/openspec/changes/unify-site-shapes/acceptance/settlement-sticky-1440.webp). На всех четырёх маршрутах измеренный радиус крайней ячейки меняется 11 → 0 → 11 px вместе с существующим stuck-состоянием.
- Меню: [desktop](/openspec/changes/unify-site-shapes/acceptance/menu-open-1440.webp), [390 px](/openspec/changes/unify-site-shapes/acceptance/menu-open-390.webp), [320 px](/openspec/changes/unify-site-shapes/acceptance/menu-open-320.webp). Проверены открытие с клавиатуры, Tab/Shift+Tab, Escape и возврат фокуса.
- Поиск проверен на production-сборке с индексом через отдельный статический preview: [desktop](/openspec/changes/unify-site-shapes/acceptance/search-focus-1440.webp), [390 px](/openspec/changes/unify-site-shapes/acceptance/search-focus-390.webp), [320 px](/openspec/changes/unify-site-shapes/acceptance/search-focus-320.webp). Запрос «тариф», внешний радиус 16 px, контур фокуса 2 px, закрытие возвращает фокус. Dev-индекс отсутствовал; его ошибочное состояние не использовалось как подтверждение выдачи.
- Согласованность разделов: [карточка поселка](/openspec/changes/unify-site-shapes/acceptance/settlement-1440.webp), [профиль](/openspec/changes/unify-site-shapes/acceptance/people-390.webp), [Сарафан](/openspec/changes/unify-site-shapes/acceptance/sarafan-1440.webp), [отзывы на 320 px](/openspec/changes/unify-site-shapes/acceptance/reviews-320.webp), [новость](/openspec/changes/unify-site-shapes/acceptance/news-390.webp), [KB](/openspec/changes/unify-site-shapes/acceptance/kb-390.webp).

Контраст непрозрачных функциональных границ и фокуса соответствует принятой палитре: `border-strong` на `surface` / `surface-muted` — 3.51 / 3.13; `focus` — 5.75 / 5.14. Цвета особых контекстов над картой и полупрозрачным меню не заменялись; их прежние непрозрачные контуры сохранены.

## Увеличенный текст и печать

На сравнении, калькуляторе и событиях выполнена диагностическая проверка root font size 200% на 320/390 px. **Это не настоящий browser zoom.** Переполнение на production до изменения и локально совпадает: на 320 px — 188/201/133 px, на 390 px — 118/131/63 px соответственно. В сравнении координаты и размеры фильтров, кнопки карты и select совпали с исходным видом; изменилось только оформление углов.

Новые формы не исправляют ранее выявленные ограничения увеличенного текста #1069–#1073. Радиусы и проверка стрелок масштабируются с текущим root font size. Два прежних дефекта попапа сравнения описаны ниже; их исправление по решению владельца вынесено отдельно.

Печатный CSS сверен: для блока сопоставления текста остаются прямые углы и видимое содержание; экранные full-bleed правила карты не действуют в print. Системная печать и browser zoom остаются ручной приёмкой, а не результатом CSS-эмуляции.

## Настоящие карты

Обе карты проверены на реальном SDK через штатный dev на `localhost:4321`, без подмены Яндекса.

- Общая карта: попап и слои на [1440 px](/openspec/changes/unify-site-shapes/acceptance/map-repeat-1440-popup-focus.webp), [390 px](/openspec/changes/unify-site-shapes/acceptance/map-repeat-390-popup.webp), [320 px](/openspec/changes/unify-site-shapes/acceptance/map-repeat-320-popup.webp). Панели имеют 16 px, строки слоёв — 8 px; кнопки-иконки круглые. Проверены переключение части «Парк», фокус закрытия и Enter, перемещение к обоим краям карты, сохранение выбора. [Слои на 320 px](/openspec/changes/unify-site-shapes/acceptance/map-repeat-320-layers-park-enabled.webp).
- При root 200% фактическая высота содержимого W50 равна доступной высоте 222 px, вертикальной прокрутки там нет. Отдельно диагностически ограничили высоту самой карты 180 px без изменения данных: реальный попап получил `clientHeight=97`, `scrollHeight=111`, `scrollTop=14`, сохранив радиус 16 px и `overflow-y:auto`. [Снимок сжатой сцены](/openspec/changes/unify-site-shapes/acceptance/map-popup-constrained-390.webp) проверяет прокрутку, не предлагая такую компоновку для production.
- Сравнение: попап, Tab-фокус и Enter-закрытие на 1440/390/320. Обычная область close — 44 × 44 px. При безопасном примыкании [стрелка сохраняет привязку](/openspec/changes/unify-site-shapes/acceptance/compare-repeat-390-safe-arrow.webp): центры стрелки и маркера совпали в x=326. У скруглённых краёв стрелка скрыта; положение панели и точки не компенсируется смещением.
- [Место с подписью](/openspec/changes/unify-site-shapes/acceptance/burzhuyka-map-390-corners.webp) и [событие](/openspec/changes/unify-site-shapes/acceptance/event-map-390-corners.webp): поверхность 12 px, цельные углы, видимая атрибуция, круглое календарное действие. Full-bleed редакционная карта в проверенной новости сохраняет прямые мобильные углы.
- Первый прогон общей карты был заблокирован 504 локального оптимизированного модуля clusterer после параллельных сборок. Перезапуск собственного dev устранил сбой без изменения приложения; снимки `map-*-sdk-blocked.webp` сохраняют только историю этой неудачной попытки. Итоговая приёмка основана на `map-repeat-*`.

### Прежние дефекты и решение владельца

Владелец разрешил завершить #1048 с принятыми формами, а эти подтверждённые на production дефекты вынести в отдельные тикеты:

- [#1076](https://github.com/silentroach/kpshelkovo/issues/1076): попап у нижнего правого края перекрывает атрибуцию. На 390 px после настоящего drag production и localhost показывают одинаковую панель `(105, 429.44)–(361, 532.44)`. [Production](/openspec/changes/unify-site-shapes/acceptance/baseline-production-compare-390-lower-right.webp), [текущая ветка](/openspec/changes/unify-site-shapes/acceptance/compare-repeat-390-lower-right.webp).
- [#1075](https://github.com/silentroach/kpshelkovo/issues/1075): при root 200% на 320 px крестик выходит за панель и обрезается картой. Справа панель заканчивается на 275 px, close — 332.47 px, карта — 287 px; геометрия production и текущей ветки совпала. [Production](/openspec/changes/unify-site-shapes/acceptance/baseline-production-compare-320-text200.webp), [текущая ветка](/openspec/changes/unify-site-shapes/acceptance/compare-map-320-text200.webp).

Новые регрессии формы и стыка стрелки исправлены внутри этого change; существующее размещение и компоновка попапов не расширялись на эти две задачи.

## Стоимость сборки

`pnpm bundle:analyze` обновил оба YAML-отчёта. Состав модулей и точки загрузки не изменились; новых зависимостей, импортов и runtime-механизмов нет. Уточнение условия стрелки добавило 223 байта к `PlaceMap` JS (67 Brotli) и 173 байта к explorer JS (72 Brotli). CSS увеличился за счёт общих токенов и явных scoped-правил углов; показатели сохранены в [assets.yaml](/docs/bundle/assets.yaml) и [client.yaml](/docs/bundle/client.yaml).

Все запущенные нами браузерные сессии закрыты; dev и отдельный статический preview остановлены.

## Независимая проверка

- Два субагента внесли независимые группы CSS-правок; отдельный субагент запустил существующие браузерные регрессии, другой проверял реальные карты.
- Первый проход reviewer выявил риск стыка стрелки и скруглённого угла. Advisor подтвердил локальное уточнение условия показа вместо смещения стрелки или нового механизма размещения; оно реализовано и проверено адресными тестами.
- Замечание о шуме форматирования разобрано: изменения переносов Astro-разметки воспроизводятся проектным Prettier; вручную обходить обязательный форматтер не стали.
- Итоговое ревью устойчивого полного diff и проверка sync/archive ещё ожидаются.
