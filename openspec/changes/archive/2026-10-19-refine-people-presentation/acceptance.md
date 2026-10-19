# Приёмка профилей людей

19 октября 2026 года. Issue [#1063](https://github.com/silentroach/kpshelkovo/issues/1063), родитель [#1045](https://github.com/silentroach/kpshelkovo/issues/1045). Согласованный план и примерка сохранены в `b854f14f`, база ветки `492208a9b62e0820ef037df5f2598c6553106feb`. [Разрешение реализации](https://github.com/silentroach/kpshelkovo/issues/1063#issuecomment-6270967643).

## Результат

- Должность и организация показаны отдельными типографированными строками. Отсутствующие поля пропускаются без заглушек.
- На телефоне контакты идут перед портретом; на desktop портрет сохраняет правую колонку и выравнивание с breadcrumbs. Фото сохраняет полный кадр, источник и размеры; край оформлен тонкой границей и радиусом 12 px без тени.
- Контакты используют обычное начертание, цвет действия и доступные hover/focus. Пустой HTML-блок не создаётся вместе с заголовком и сообщением.
- У Юрия Кизилова одна роль: генеральный директор группы компаний «Земля МО». Прежняя роль Сергея Минакова перенесена в body, текущие `position`/`company` удалены. Контакты, имя и падежные формы обоих сохранены.

## Проверки кода и данных

- `pnpm --filter @shelkovo/www typecheck`: успешно, включая новый тест страницы.
- `pnpm --filter @shelkovo/www exec vitest run src/lib/people`: 72 теста в 13 файлах прошли. Новый тест рендерит реальную Astro-страницу с подменой только загрузчика; проверяет четыре сочетания необязательных полей, отсутствие фото и пустой секции, DOM-порядок и исходные ссылки.
- `pnpm --filter @shelkovo/www test`: полный набор приложения прошёл, 2076 тестов в 252 файлах.
- `pnpm lint`: весь workspace прошёл, включая восемь проверок локального lint-правила.
- `pnpm --filter @shelkovo/www build`: успешно, 384 страницы и production-индекс Pagefind. Предупреждения `astro-compressor` о прежнем `fileExtensions` не относятся к этому diff.
- `pnpm --filter @shelkovo/www exec vitest run -c vitest.search-quality.config.ts`: пять проверок актуальной сборки прошли. Раздельные строки сохраняют прежнюю область `data-pagefind-body`, контакты по-прежнему исключены. Веса, настройки и корпус поиска не менялись; обновлённые сведения профилей индексируются как обычная редакционная правка.
- Готовые HTML/JSON/Markdown/JSON-LD двух профилей сверены с данными и проверены адресными Zod-проверками. Юрий имеет согласованные `position`/`company` и `Person.jobTitle`/`worksFor`; у Сергея эти поля отсутствуют, сведения о прошлом сохранены в body. В новости `/news/2026/05/apple-garden/` каноническое упоминание Юрия имеет title «Генеральный директор, группа компаний „Земля МО“». Отдельных новых публичных схем нет.
- Существующие клиентские импорты и инициализация не менялись, новых скриптов страницы нет. Повторный анализ клиентских бандлов не требовался.

## Браузер

Использована готовая production-сборка `dist/www`, отданная локальным HTTP-сервером на `127.0.0.1:4364`. `pnpm dev` не запускался. Проверки выполнены через отдельные именованные сессии `agent-browser`; они закрыты после проверки.

- Пять профилей на 320×844, 390×844 и 1440×1000: горизонтального переполнения нет, все фото загружаются и сохраняют пропорции. Верх портрета на desktop совпадает с breadcrumbs. Контакты, источник и body доступны в правильном DOM-порядке. [Измерения](/openspec/changes/archive/2026-10-19-refine-people-presentation/acceptance/browser.json).
- 39 дополнительных случаев: отсутствие одного или обоих полей роли; квадратное и широкое изображение; фото и body без контактов; ошибка запроса фотографии; длинные имя, должность и непрерывный контакт; увеличение корневого шрифта до 200% у пяти профилей на трёх ширинах. Эти проверки временно меняли DOM/CSS готовой страницы, не данные приложения. [Результаты](/openspec/changes/archive/2026-10-19-refine-people-presentation/acceptance/edges.json).
- Tab-порядок на телефоне: Telegram, телефон, источник фото. Видимый фокус с контуром не меньше 2 px, подчёркивание при hover/focus; наведение не меняет геометрию ссылки.
- При заблокированных запросах скриптов `**/*.js` профиль Кирилла сохраняет имя, контакты, источник фотографии и описание в готовой HTML-странице.
- Axe-core 4.12.1, область `main`, теги `wcag2a,wcag2aa`, ширина 390 px: у всех пяти профилей 0 violations и 0 incomplete. В проверку вошёл фактический контраст текста и ссылок. [Отчёт](/openspec/changes/archive/2026-10-19-refine-people-presentation/acceptance/a11y.json).

## Снимки готового сайта

На телефоне сохранена полная высота страницы; desktop-снимки обрезаны по содержимому без изменения масштаба.

- Кирилл Щемелинин: [390 px](/openspec/changes/archive/2026-10-19-refine-people-presentation/acceptance/kschemelinin-390.webp), [320 px](/openspec/changes/archive/2026-10-19-refine-people-presentation/acceptance/kschemelinin-320.webp), [1440 px](/openspec/changes/archive/2026-10-19-refine-people-presentation/acceptance/kschemelinin-1440.webp).
- Геннадий Мозгов: [390 px](/openspec/changes/archive/2026-10-19-refine-people-presentation/acceptance/gmozgov-390.webp), [320 px](/openspec/changes/archive/2026-10-19-refine-people-presentation/acceptance/gmozgov-320.webp), [1440 px](/openspec/changes/archive/2026-10-19-refine-people-presentation/acceptance/gmozgov-1440.webp).
- Максим Сорочинский: [390 px](/openspec/changes/archive/2026-10-19-refine-people-presentation/acceptance/msorochinsky-390.webp), [320 px](/openspec/changes/archive/2026-10-19-refine-people-presentation/acceptance/msorochinsky-320.webp), [1440 px](/openspec/changes/archive/2026-10-19-refine-people-presentation/acceptance/msorochinsky-1440.webp).
- Сергей Минаков: [390 px](/openspec/changes/archive/2026-10-19-refine-people-presentation/acceptance/sminakov-390.webp), [320 px](/openspec/changes/archive/2026-10-19-refine-people-presentation/acceptance/sminakov-320.webp), [1440 px](/openspec/changes/archive/2026-10-19-refine-people-presentation/acceptance/sminakov-1440.webp).
- Юрий Кизилов: [390 px](/openspec/changes/archive/2026-10-19-refine-people-presentation/acceptance/ykizilov-390.webp), [320 px](/openspec/changes/archive/2026-10-19-refine-people-presentation/acceptance/ykizilov-320.webp), [1440 px](/openspec/changes/archive/2026-10-19-refine-people-presentation/acceptance/ykizilov-1440.webp).

## Ограничения

- Увеличение корневого шрифта до 200% служило диагностикой увеличенного текста, а не настоящим browser zoom. При ширине 320 px документ имеет `scrollWidth: 323` из-за прежнего переполнения бренда в общей шапке; то же измерение подтверждено на production. В локальной версии переполнение не увеличилось. Общая шапка не менялась в этой задаче.
- Native browser zoom, системная печать и настоящий screen reader не проверялись. Автоматический аудит не заменяет эти сценарии.
- Окончательное человеческое ревью и merge остаются владельцу.

## Ревью и структура

- Первый полный проход независимого reviewer охватил плановый коммит, исходники, новые тесты и материалы приёмки относительно базы выше. Подтверждённых проблем и предложений упростить код нет. Reviewer опирался на результаты команд автора, сам их не запускал.
- Перед sync/archive `pnpm openspec:validate` прошёл: 52 проверки активных изменений/спецификаций и 110 архивов. Форматирование и `git diff --check` прошли.
- После sync/archive `pnpm openspec:validate` прошёл: 52 основные спецификации и 111 архивов. Архивные ссылки проверены, путь к workspace в скрипте примерки обновлён.
- Повторный независимый reviewer-проход проверил `f25f9ee3` относительно той же базы с учётом прежнего отчёта. Основная спецификация соответствует delta, все восемь задач завершены; подтверждённых проблем и Lean-предложений нет. Последующая запись этого результата в приёмке не меняет код приложения.
