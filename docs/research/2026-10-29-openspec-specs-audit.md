# Аудит действующих OpenSpec specs

Исходное состояние: `9ae75e317215cf41883dbc31b10dbf70e168cffb`, 29 октября 2026 года. Задача — найти несоответствия, повторные сценарии и излишнюю детализацию, сохранив действующие обязательства.

## Границы и метод

- В охват входят все 55 документов из [основных specs](/openspec/specs/). Исходный объём — 7254 строки, 353 требования и 1017 сценариев.
- Активные и архивные changes исключены по просьбе владельца.
- Шесть параллельных агентов проверяли предметные группы; основная сессия — оставшиеся specs, переносы между документами и итоговый diff. Основания — действующие docs, ADR, код и тесты.
- Для безопасной редактуры применён короткий путь из [AGENTS.md](/AGENTS.md#выбор-маршрута) и [критерии отбора требований](/AGENTS.md#отбор-требований-для-specs). Расхождение с кодом само по себе не служит разрешением изменить контракт.
- Это аудит документации с адресной сверкой реализации. Он не подтверждает всё поведение сайта в браузере.

## Результат

- Отредактированы 35 specs. Число требований осталось 353; сценариев стало 957 вместо 1017, строк 6944 вместо 7254.
- Визуальные подробности панели участков перенесены в действующий дизайн-гайд. Долговечное правило переиспользования медиа перенесено из runbook в общий spec.
- Десять расхождений с реализацией или между действующими документами описаны ниже с основаниями для отдельного исправления или решения.
- Все 55 specs прошли `pnpm exec openspec validate --specs --strict --no-interactive`; область структурной проверки ограничена основными specs по запросу владельца. Форматирование и `git diff --check` также прошли.

## Исправления

### Карты, участки и места

- [site-maps](/openspec/specs/site-maps/spec.md): объединены мобильная ширина и подпись редакционной карты; удалены повторы резервного перехода и раскрытия геометрии набора. Общая политика жестов Markdown-карт и превью мест теперь имеет одного владельца. Различающиеся правила resize сохранены: превью места вписывает всю геометрию, а редакционная карта после ручного движения сохраняет выбранный кадр.
- [map-geodata](/openspec/specs/map-geodata/spec.md) и [public-coordinate-precision](/openspec/specs/public-coordinate-precision/spec.md): сокращены повторные сценарии принадлежности геометрии, расширения полигонов, сохранности строк и одинаковой точности публичных представлений. Геометрия, отверстия, числовой ID `0`, поля `iconCaption`/`iconContent` и восемь десятичных знаков остаются контрактами.
- [map-selection-sets](/openspec/specs/map-selection-sets/spec.md) и [map-layer-links](/openspec/specs/map-layer-links/spec.md): уточнены владельцы прямых целей и правил состава, объединено сохранение слоёв при снятии набора. Убраны неопределённые ссылки на «прежнее поведение»; значения приглушения и цвет выбора оставлены существующему дизайн-гайду.
- [parcel-map](/openspec/specs/parcel-map/spec.md): объединена матрица количества обозначений и кадастровых частей, удалены копии правил подсветки наборов. Исправлены два внутренних противоречия: точка подписи находится **не на** внешней границе, а неизвестная площадь не обнуляет известную историю цены. Переход по маркеру места отделён от выбора участка согласно ADR-041. Иконки и порядок частей панели перенесены в [дизайн-гайд](/docs/design/design-code-shelkovo.md#участки-на-общей-карте).
- [parcel-updates](/openspec/specs/parcel-updates/spec.md): объединены повторы повторного использования подтверждений; независимость поправки отображения от кадастровых данных связана с владельцем в `parcel-map`.
- В [place-card-presentation](/openspec/specs/place-card-presentation/spec.md) убраны копии общих жестов и загрузки. [place-map-visibility](/openspec/specs/place-map-visibility/spec.md) различает публичность места и показ на общей карте; отсутствие слоя описано без привязки к старым данным. В [place-markdown-card](/openspec/specs/place-markdown-card/spec.md) и [place-opening-hours](/openspec/specs/place-opening-hours/spec.md) объединены повторы отсутствующих сведений и расписания.

### Календарь и статус

- [events-calendar](/openspec/specs/events-calendar/spec.md): убраны повторные сценарии ICS, редакторских ссылок, многодневности в новости, поискового окна и breadcrumbs. Сохранились UTC, условные два часа только в ICS, включительность периода, отмена, адреса, UID и 30-дневное поисковое окно. Пример периода больше не задаёт отдельный буквальный формат даты.
- [event-widget](/openspec/specs/event-widget/spec.md): объединены повторы о маркере, готовности карты и фокусе, общие гарантии связаны с `site-maps`. Доступность экспорта и формат ICS имеют разных явно указанных владельцев; дизайн-гайд ссылается на контракт плашки.
- [news-event-calendar](/openspec/specs/news-event-calendar/spec.md): устранена неточная формулировка стандарта — текстовые значения экранируются по RFC 5545, параметры кодируются по RFC 6868. Это соответствует [пакету iCalendar](/packages/ical/README.md).
- [status-lifecycle](/openspec/specs/status-lifecycle/spec.md): скобками уточнена группировка условий активной фазы; удалён повтор гарантии публичного JSON. Полуоткрытые границы и моменты клиентского пересчёта сохранены.

### Редакционные представления

- [entity-mentions](/openspec/specs/entity-mentions/spec.md): объединены повторы сохранения авторской подписи, исключённых контекстов, необязательности ссылок выжимки и сортировки backlinks. Сохранены отдельность источников и все правила устойчивого порядка.
- [markdown-service-blocks](/openspec/specs/markdown-service-blocks/spec.md): объединены условия автоматических якорей карт; неопределённое «прежнее поведение» заменено действующими правилами полного GeoJSON-блока. Добавлены ссылки на владельцев геоданных, точности координат, наборов и смысловых выделений.
- [owner-reviews](/openspec/specs/owner-reviews/spec.md): удалены вторые копии сценариев отказа от ответственности и получения Markdown по `Accept`.
- [news-list-presentation](/openspec/specs/news-list-presentation/spec.md) ссылается на `date-labels` без второй копии сценария диапазона дней; [knowledge-base](/openspec/specs/knowledge-base/spec.md) явно отделяет состав оглавления от своей композиции.

### Поиск, каталоги и публичная выдача

- [search](/openspec/specs/search/spec.md): объединены повторные сценарии ошибки загрузки, контекста тегов и даты статуса, участка без HTML-карточки и доставки Markdown. Сохранены корпус, 30-дневные окна, задержка 200 мс и правила смешанной выдачи.
- [public-content-discovery](/openspec/specs/public-content-discovery/spec.md) и [public-markdown-delivery](/openspec/specs/public-markdown-delivery/spec.md): объединены повторные сценарии календарных данных одной новости, общего companion и Markdown-only входа. Выбор полного источника, HTTP-заголовки, negotiation и robots сохранены.
- [contacts-catalog](/openspec/specs/contacts-catalog/spec.md): объединены сценарии смешанного опыта и положительного результата с нерешённой проблемой, удалена копия negotiation. [neighbor-inventory](/openspec/specs/neighbor-inventory/spec.md): сценарий локальных якорей обобщён без предположения о нескольких полных предложениях на одной странице; уточнены владельцы смежных контрактов.
- [public-media](/openspec/specs/public-media/spec.md): объединены повторы иллюстрации отзыва. Уточнена область JPEG-профиля инвентаря: он относится к новым объектам `ukogo/`; переиспользование сохраняет байты, метаданные и правила исходного объекта. Последняя гарантия перенесена в общее требование из [действующего runbook](/ops/storage/public-media.md#структура-ключей), согласованного с редакционными правилами и схемой инвентаря.

### Интерфейс и загрузка

- [homepage](/openspec/specs/homepage/spec.md): объединены повторные сценарии адаптивной подборки и пустой сводки. В дизайн-гайде исправлена устаревшая копия размеров ведущего описания: оно следует общей роли `ui-copy`, как предписывал тот же абзац.
- [site-navigation](/openspec/specs/site-navigation/spec.md): объединены повторы полной цепочки крошек и клавиатурной навигации; подложка и отступы связаны с дизайн-гайдом. Все родительские переходы, структурированные данные и доступность без JavaScript сохранены.
- [client-load-recovery](/openspec/specs/client-load-recovery/spec.md): удалён сценарий, только отсылавший к требованию ниже. [component-runtime-delivery](/openspec/specs/component-runtime-delivery/spec.md) ссылается на владельца пересчёта статуса; гарантии освобождения ресурсов сохранены.
- [site-typography](/openspec/specs/site-typography/spec.md) и [site-analytics](/openspec/specs/site-analytics/spec.md): для относительных слов «новые» и «существующие» явно названа точка сравнения — тот же интерфейс до изменения типографики и учёт целей до отключения аналитики. Новых исключений или фиксированного перечня целей не вводится.

### Инструменты, сравнение и регламент

- [agent-tooling](/openspec/specs/agent-tooling/spec.md): удалены повторные сценарии первого обращения к advisor, самостоятельного исследования и передачи спора владельцу. Проверка корректности и `Lean` описаны как два прохода единого метода `ponytail-review`, согласно действующим профилю и руководству. Процедура обновления связана с её владельцем в [руководстве разработчика](/docs/development.md#openspec).
- [compare-tariff-presentation](/openspec/specs/compare-tariff-presentation/spec.md): конкретные цвета и начертание ранга теперь определяет существующий [дизайн-гайд](/docs/design/design-code-shelkovo.md#мобильные-поверхности-сравнения). Spec сохраняет приоритет тарифа, единое направление сравнения, читаемость исходной цены и смысл без цвета.
- [regulation-calculator](/openspec/specs/regulation-calculator/spec.md): повторный сценарий широкого экрана включён в общее требование читаемости. Отдельные условия клавиатуры, отсутствия JavaScript и прокрученной таблицы сохранены.
- [compare-settlement-location](/openspec/specs/compare-settlement-location/spec.md), [content-print](/openspec/specs/content-print/spec.md), [estimate-detail-sources](/openspec/specs/estimate-detail-sources/spec.md) и [regulation-service-mapping](/openspec/specs/regulation-service-mapping/spec.md) не требуют сокращения. Формула и порядок округления расстояний, полнота печати, версия и область действия ID источников, различие прямого и частичного подтверждения — самостоятельные контракты.

## Расхождения, требующие отдельного исправления или решения

### Исчезновение алиаса многокадастровой позиции

[parcel-updates](/openspec/specs/parcel-updates/spec.md) требует сохранять запись и историю при исчезновении алиаса. [Reconcile](/apps/www/src/lib/parcels/reconcile.ts) при изменении списка обозначений многокадастровой позиции сообщает конфликт идентичности и пропускает запись; отсутствующий в результате прежний файл попадает в `deleted`. [Обновлятор](/apps/www/scripts/parcels/update.ts) применяет результат и при таких конфликтах. [Инструкция](/docs/parcel-updates.md#ревью-результата) предусматривает ручной разбор изменившейся группы.

Нужно определить границу обычного удаления алиаса и изменения идентичности группы, а также сохранность прежней записи до разбора конфликта. Текущее расхождение нельзя устранить только редакторским исключением из гарантии сохранения истории. Импорт в ходе аудита не запускался.

### Опубликованный ICS после отзыва точного времени

[news-event-calendar](/openspec/specs/news-event-calendar/spec.md#requirement-календарная-идентичность-не-зависит-от-содержания-события) обещает сохранность опубликованного адреса при исправлении времени. Если у мероприятия вместо точных часов остаётся одна дата, [mapper](/apps/www/src/lib/events/mapper.ts) убирает `icsUrl`, а [новостной маршрут ICS](/apps/www/src/pages/news/[year]/[month]/[entry]/[event].ics.ts) исключает этот файл. При этом `events-calendar` запрещает предлагать однодневный all-day экспорт для неизвестных часов.

Нужно согласовать поведение уже опубликованного календарного файла в таком переходе. Это нельзя решить удалением гарантии совместимости или подстановкой вымышленных часов.

### Год в крупной дате мероприятия

[date-labels](/openspec/specs/date-labels/spec.md) требует год для автоматической даты другого московского года. [EventWidget](/apps/www/src/components/events/EventWidget.astro) для обычного однодневного мероприятия выводит день, месяц и часы без года. На подробной странице год можно найти в breadcrumbs, но в новостной плашке он не появляется автоматически.

Нужно уточнить применение общего правила к крупной дате плашки и обеспечить различимость года. Отдельное исключение для этой поверхности в проверенных действующих документах не найдено; контракт в ходе аудита не ослаблялся.

### Внутренние ссылки KB в Markdown

[knowledge-base](/openspec/specs/knowledge-base/spec.md#requirement-html-и-markdown-представляют-одну-страницу-kb) требует вести внутренние ссылки к companions. [Преобразователь](/apps/www/src/lib/kb/markdown.ts) обрабатывает только root-relative адреса узлов `link`, пропуская `definition`. Поэтому `[Справка][guide]` с определением `[guide]: /kb/topic/` сохраняет HTML-назначение. Абсолютные ссылки того же сайта также остаются HTML; это прямо закреплено в [тесте](/apps/www/src/lib/kb/tests/markdown.test.ts).

Нужно проверить и исправить reference-ссылки и отдельно уточнить, охватывает ли договорённость абсолютные same-origin адреса. Spec не сужен до ограничений реализации. Вывод получен статическим анализом, без запуска нового сценария.

### Определения ссылок и сноски в транскриптах

[meetings-archive](/openspec/specs/meetings-archive/spec.md#requirement-markdown-ведёт-от-индекса-к-полным-частям) требует полный текст каждой части. Однако `segmentTextBlocks` в [Markdown-генераторе встреч](/apps/www/src/lib/meetings/markdown.ts) удаляет `definition` и `footnoteDefinition`. Если реплика использует такую разметку, companion теряет назначение ссылки либо текст сноски; HTML проходит полноценный Markdown-рендер.

Нужно сохранить определения при сборке частей и проверить повторение локальных идентификаторов между репликами. В ходе аудита код и требование полноты не изменялись; находка основана на статическом анализе допустимого входа.

### Индикатор кнопки слоёв

Сценарий «Активный выбор виден при закрытой панели» в [parcel-map](/openspec/specs/parcel-map/spec.md) требует убрать маркер после выключения всех частей участков. [PlaceMap](/apps/www/src/components/places/PlaceMap.svelte) сохраняет его при включённой инфраструктуре. Нужно определить, обозначает индикатор только участки или все переключаемые слои; правило не переписано по одному коду.

### Допустимый внешний адрес карты места

[Дизайн-гайд](/docs/design/design-code-shelkovo.md#действия-встроенных-карт) допускает сохранённую ссылку вне Яндекс Карт. [Редакторские правила](/apps/www/src/data/places/AGENTS.md) и [raw-схема](/apps/www/src/lib/places/raw-schema.ts) принимают только `https://yandex.ru/maps…` и `/navi…`. Renderer может показать другой домен, но это не доказывает его допустимость на входе. Нужно согласовать границу редакционного формата и затем синхронизировать документы.

### Обычный текст выжимок «Сарафана»

[contacts-catalog](/openspec/specs/contacts-catalog/spec.md) и [редакторские правила](/apps/www/src/data/contacts/AGENTS.md) называют выжимку обычным текстом без обработки mentions. [ContactReviews](/apps/www/src/components/contacts/ContactReviews.astro) рендерит её через Markdown; [тесты loader](/apps/www/src/lib/contacts/tests/load.test.ts) и [Markdown](/apps/www/src/lib/contacts/tests/markdown.test.ts) намеренно используют разметку выделения. Нужно явно выбрать, означает ли «обычный текст» буквальный вывод Markdown-синтаксиса или только отсутствие mentions.

### Граница проверки конечного payload карт

[site-maps](/openspec/specs/site-maps/spec.md#requirement-подготовленные-данные-карт-проверяются-до-публикации) требует проверки конечного HTML-payload после подготовки. [MapPreview](/apps/www/src/components/maps/MapPreview.astro) сериализует `preview` напрямую; [PlacePreview](/apps/www/src/components/places/PlacePreview.astro) проверяет дополнительную геометрию схемой, а весь объект — только типом `MapPreviewData`. Нужно уточнить, охватывает контракт весь объект или подготовленные геоданные. Это неоднозначность области проверки, а не подтверждённый пользовательский сбой.

### Браузерные тесты шапки ожидают одну группу меню

[Браузерный сценарий шапки](/apps/www/tests/site-header-a11y.browser.spec.ts) обращается к общим селекторам dropdown как к единственному элементу и ожидает после «Тариф 815» фокус на «Карте». В [SiteNav](/apps/www/src/components/site/SiteNav.astro) уже две группы; следующая кнопка — «Справочник», и [unit-тест](/apps/www/src/components/site/SiteNav.test.ts) проверяет обе группы. Нужно обновить адресацию и ожидаемый порядок браузерного теста по действующей навигации. Расхождение найдено чтением, прогон не выполнялся.

## Охват

Каждая группа прочитана целиком, включая сценарии:

- Общие карты: `site-maps`, `map-geodata`, `map-layer-links`, `map-selection-sets`, `public-coordinate-precision`.
- Участки и места: `parcel-map`, `parcel-records`, `parcel-updates`, `place-card-presentation`, `place-map-visibility`, `place-markdown-card`, `place-nearby-navigation`, `place-opening-hours`.
- Календарь и статус: `events-calendar`, `event-widget`, `news-event-calendar`, `news-event-places`, `status-lifecycle`, `date-labels`.
- Редакционные представления: `entity-mentions`, `markdown-service-blocks`, `markdown-telegram-links`, `knowledge-base`, `meetings-archive`, `news-article-presentation`, `news-authorship`, `news-list-presentation`, `owner-reviews`, `people-photos`, `people-profile-presentation`.
- Поиск, каталоги и публичная выдача: `search`, `public-content-discovery`, `public-markdown-delivery`, `public-media`, `neighbor-inventory`, `contacts-catalog`.
- Интерфейс и загрузка: `client-load-recovery`, `component-runtime-delivery`, `homepage`, `installed-web-app`, `site-analytics`, `site-color-roles`, `site-content-emphasis`, `site-navigation`, `site-shapes`, `site-surfaces`, `site-typography`, `web-font-loading`.
- Инструменты, сравнение и регламент: `agent-tooling`, `compare-settlement-location`, `compare-tariff-presentation`, `content-print`, `estimate-detail-sources`, `regulation-calculator`, `regulation-service-mapping`.
